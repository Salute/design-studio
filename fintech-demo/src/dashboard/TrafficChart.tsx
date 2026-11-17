import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import type { RangeData, Referral, SeriesKey } from "./data";
import { BrandMark } from "./BrandMark";
import styles from "./TrafficChart.module.css";

/** Samples per line. Every shape has the same count, so any two shapes morph point for point. */
const SAMPLES = 240;
/** Room above the tallest peak, as a share of the plot. The peak sits a little above the middle, like the reference. */
const HEADROOM = 1.6;
const TOP = 8;

type Shape = { values: number[]; end: number };
type Track = { from: Shape; to: Shape; shape: Shape; presence: number };

const { spring, duration, ease } = motionTokens;
/** Time-defined springs drop velocity when retargeted, so the morph runs on the same spring written as stiffness and damping. */
const physical = ({ visualDuration, bounce }: { visualDuration: number; bounce: number }) => {
  const root = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring" as const, stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta: .0005, restSpeed: .001 };
};
const settle = physical(spring.smooth);
const glide = physical(spring.snappy);
const follow = { stiffness: glide.stiffness, damping: glide.damping };
const draw = { duration: 1.15, ease: [...ease.inOut] } as const;

/** A soft kernel through the hourly counts, so each burst of visits reads as one smooth hill, like the reference. */
const SPREAD = .62;
function shapeFor(values: number[], now: number, count: number): Shape {
  const last = Math.max(1, count - 1);
  const seen = values.slice(0, now + 1);
  const end = now / last;
  const samples = Array.from({ length: SAMPLES + 1 }, (_, sample) => {
    const position = (now * sample) / SAMPLES;
    return seen.reduce((sum, value, index) => sum + value * Math.exp(-((position - index) ** 2) / (2 * SPREAD * SPREAD)), 0);
  });
  return { values: samples, end };
}

/** When an in-out cubic draw reaches a share of the width, so the marker lands as the line arrives under it. */
const timeToReach = (share: number) => share < .5 ? Math.cbrt(share / 4) : 1 - Math.cbrt(2 * (1 - share)) / 2;

const mix = (from: Shape, to: Shape, progress: number): Shape => ({
  values: to.values.map((value, index) => from.values[index]! + (value - from.values[index]!) * progress),
  end: from.end + (to.end - from.end) * progress,
});

function valueAt(shape: Shape, fraction: number) {
  if (shape.end <= 0) return shape.values[0] ?? 0;
  const at = Math.min(1, Math.max(0, fraction / shape.end)) * SAMPLES;
  const low = Math.floor(at), high = Math.min(SAMPLES, low + 1);
  return shape.values[low]! + (shape.values[high]! - shape.values[low]!) * (at - low);
}

const sourceName: Record<Referral["source"], string> = { google: "Google", x: "X", github: "GitHub" };

export interface TrafficChartProps {
  data: RangeData;
  visible: Record<SeriesKey, boolean>;
  onActiveChange?: (index: number | null) => void;
}

export function TrafficChart({ data, visible, onActiveChange }: TrafficChartProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, amount: .25 });
  const size = useRef({ w: 0, h: 0 });
  const [width, setWidth] = useState(0);
  const pad = width < 640 ? 20 : 44;

  const paths = useRef(new Map<SeriesKey, SVGPathElement>());
  const areaPath = useRef<SVGPathElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const nowLine = useRef<HTMLSpanElement>(null);
  const pulse = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const crosshair = useRef<HTMLSpanElement>(null);
  const dots = useRef(new Map<SeriesKey, HTMLSpanElement>());
  const tip = useRef<HTMLDivElement>(null);

  const count = data.points.length;
  const last = Math.max(1, count - 1);
  const targets = useRef<Record<SeriesKey, Shape>>({ people: shapeFor([], 0, 1), views: shapeFor([], 0, 1) });
  targets.current = {
    people: shapeFor(data.points.map(point => point.people), data.now, count),
    views: shapeFor(data.points.map(point => point.views), data.now, count),
  };
  // The scale fits the drawn curves, not the raw counts: neighbouring hours add up into a taller hill.
  const peak = Math.max(1, ...(["people", "views"] as SeriesKey[]).filter(key => visible[key]).flatMap(key => targets.current[key].values));

  const tracks = useRef<Record<SeriesKey, Track> | null>(null);
  if (!tracks.current) {
    const make = (key: SeriesKey): Track => ({ from: targets.current[key], to: targets.current[key], shape: targets.current[key], presence: visible[key] ? 1 : 0 });
    tracks.current = { people: make("people"), views: make("views") };
  }
  const scale = useMotionValue(peak * HEADROOM);
  const drawn = useMotionValue(0);
  const markerAt = useMotionValue(data.referral ? data.referral.index / last : 0);
  const cursor = useMotionValue(0);
  const tipTarget = useMotionValue(0);
  const tipX = useSpring(tipTarget, follow);

  const [active, setActive] = useState<number | null>(null);
  const [seen, setSeen] = useState(data);
  if (seen !== data) { setSeen(data); setActive(null); }
  const index = active === null ? null : Math.min(active, data.now);

  // One painter writes every attribute: morphs, the draw-in, the scale, the marker and the crosshair all repaint through here.
  const paint = useCallback(() => {
    const { w, h } = size.current;
    const all = tracks.current;
    if (!w || !h || !all) return;
    const span = w - pad * 2;
    const max = scale.get() || 1;
    const x = (fraction: number) => pad + fraction * span;
    const y = (value: number) => TOP + (1 - value / max) * (h - TOP);
    for (const key of ["views", "people"] as SeriesKey[]) {
      const { shape, presence } = all[key];
      const points = shape.values.map((value, sample) => `${x((shape.end * sample) / SAMPLES).toFixed(1)},${y(value * presence).toFixed(1)}`);
      const line = `M0,${y(shape.values[0]! * presence).toFixed(1)}L${points.join("L")}`;
      const path = paths.current.get(key);
      path?.setAttribute("d", line);
      if (path) path.style.opacity = String(presence);
      if (key === "people") areaPath.current?.setAttribute("d", `${line}L${x(shape.end).toFixed(1)},${h}L0,${h}Z`);
    }
    const people = all.people.shape;
    const endX = x(people.end);
    clip.current?.setAttribute("width", String(drawn.get() * (w + 4)));
    if (nowLine.current) nowLine.current.style.transform = `translateX(${endX}px)`;
    if (pulse.current) pulse.current.style.transform = `translate(${endX}px, ${y(people.values[SAMPLES]! * all.people.presence)}px)`;
    if (marker.current) marker.current.style.transform = `translateX(${x(markerAt.get())}px)`;
    const at = cursor.get();
    const cx = x(at);
    if (crosshair.current) crosshair.current.style.transform = `translateX(${cx}px)`;
    for (const key of ["people", "views"] as SeriesKey[]) {
      const dot = dots.current.get(key);
      if (dot) dot.style.transform = `translate(${cx}px, ${y(valueAt(all[key].shape, at) * all[key].presence)}px)`;
    }
    const tw = tip.current?.offsetWidth ?? 0;
    tipTarget.set(cx + 16 + tw > w - 8 ? cx - 16 - tw : cx + 16);
  }, [cursor, drawn, markerAt, pad, scale, tipTarget]);

  useMotionValueEvent(scale, "change", paint);
  useMotionValueEvent(drawn, "change", paint);
  useMotionValueEvent(markerAt, "change", paint);
  useMotionValueEvent(cursor, "change", paint);
  useLayoutEffect(paint);

  // The chart draws in its own pixels: measure, and follow resizes.
  useLayoutEffect(() => {
    const node = plot.current;
    if (!node) return;
    const read = () => { size.current = { w: node.clientWidth, h: node.clientHeight }; setWidth(node.clientWidth); paint(); };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [paint]);

  // A new range morphs every line from the shape on screen. A partial day stretches into a full one instead of redrawing.
  const signature = `${data.now}|${data.points.map(point => `${point.people}:${point.views}`).join(",")}`;
  useEffect(() => {
    const all = tracks.current!;
    for (const key of ["people", "views"] as SeriesKey[]) all[key] = { ...all[key], from: all[key].shape, to: targets.current[key] };
    if (reduced) { for (const key of ["people", "views"] as SeriesKey[]) all[key].shape = all[key].to; paint(); return; }
    const controls = animate(0, 1, { ...settle, onUpdate: progress => { for (const key of ["people", "views"] as SeriesKey[]) all[key].shape = mix(all[key].from, all[key].to, progress); paint(); } });
    return () => controls.stop();
  }, [signature, paint, reduced]);

  // A series that is switched off flattens into the baseline as it fades; the scale follows the lines on show.
  useEffect(() => {
    const all = tracks.current!;
    const controls = (["people", "views"] as SeriesKey[]).map(key => {
      const to = visible[key] ? 1 : 0;
      if (reduced) { all[key].presence = to; return null; }
      return animate(all[key].presence, to, { ...settle, onUpdate: value => { all[key].presence = value; paint(); } });
    });
    paint();
    return () => controls.forEach(control => control?.stop());
  }, [visible, paint, reduced]);

  useEffect(() => {
    if (reduced) { scale.jump(peak * HEADROOM); return; }
    const controls = animate(scale, peak * HEADROOM, settle);
    return () => controls.stop();
  }, [peak, reduced, scale]);

  useEffect(() => {
    if (!data.referral) return;
    const to = data.referral.index / last;
    if (reduced) { markerAt.jump(to); return; }
    const controls = animate(markerAt, to, settle);
    return () => controls.stop();
  }, [data.referral, last, markerAt, reduced]);

  // The line draws left to right the first time the chart is seen.
  const [isDrawn, setIsDrawn] = useState(false);
  useEffect(() => {
    if (reduced) { drawn.jump(1); setIsDrawn(true); return; }
    if (!inView) return;
    const controls = animate(drawn, 1, { ...draw, delay: .18, onComplete: () => setIsDrawn(true) });
    return () => controls.stop();
  }, [drawn, inView, reduced]);

  // The crosshair appears on the first scrubbed point and glides between the ones after it.
  const wasActive = useRef(false);
  useEffect(() => {
    if (index === null) { wasActive.current = false; return; }
    const to = index / last;
    if (reduced || !wasActive.current) { cursor.jump(to); paint(); tipX.jump(tipTarget.get()); }
    wasActive.current = true;
    if (reduced) return;
    const controls = animate(cursor, to, glide);
    return () => controls.stop();
  }, [cursor, index, last, paint, reduced, tipTarget, tipX]);

  const onActive = useRef(onActiveChange);
  useLayoutEffect(() => { onActive.current = onActiveChange; });
  useEffect(() => { onActive.current?.(index); }, [index]);

  const pointAt = (clientX: number) => {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect) return 0;
    const fraction = (clientX - rect.left - pad) / (rect.width - pad * 2);
    return Math.min(data.now, Math.max(0, Math.round(fraction * last)));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "mouse" || event.buttons) setActive(pointAt(event.clientX)); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = index ?? data.now;
    const next = ({ ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: data.now } as Record<string, number>)[event.key];
    if (event.key === "Escape") { setActive(null); return; }
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(data.now, Math.max(0, next)));
  };

  const reading = index === null ? null : data.points[index];
  const referral = data.referral;
  const markerDelay = referral && !isDrawn ? .18 + draw.duration * timeToReach(referral.index / last) : 0;

  return <div ref={root} className={styles.root} style={{ "--pad": `${pad}px` } as React.CSSProperties} data-drawn={isDrawn || undefined}>
    <div ref={plot} className={styles.plot} data-scrubbing={index !== null || undefined}
      role="slider" tabIndex={0} aria-label="Traffic over time" aria-valuemin={1} aria-valuemax={data.now + 1} aria-valuenow={(index ?? data.now) + 1}
      aria-valuetext={reading ? `${reading.label}: ${reading.people} people, ${reading.views} views` : `${data.stats.people} people, ${data.stats.views} views`}
      onPointerDown={event => { if (event.pointerType !== "mouse") event.currentTarget.setPointerCapture(event.pointerId); setActive(pointAt(event.clientX)); }}
      onPointerMove={onPointerMove}
      onPointerUp={event => { if (event.pointerType !== "mouse") setActive(null); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") setActive(null); }}
      onPointerCancel={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}>
      <svg className={styles.svg} width="100%" height="100%" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="traffic-draw" clipPathUnits="userSpaceOnUse"><rect ref={clip} x={0} y={-20} width={0} height="200%" /></clipPath>
          <linearGradient id="traffic-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity=".16" />
            <stop offset="55%" stopColor="var(--series-1)" stopOpacity=".03" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="traffic-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity=".55" />
            <stop offset="35%" stopColor="var(--series-1)" stopOpacity=".85" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g clipPath="url(#traffic-draw)">
          <path ref={areaPath} className={styles.area} fill="url(#traffic-area)" />
          <path ref={node => { if (node) paths.current.set("views", node); }} className={styles.views} />
          <path ref={node => { if (node) paths.current.set("people", node); }} className={styles.people} stroke="url(#traffic-stroke)" />
        </g>
      </svg>

      {data.nowLabel && <span ref={nowLine} className={styles.nowLine} aria-hidden="true" />}
      {data.nowLabel && <span ref={pulse} className={styles.pulse} aria-hidden="true"><span className={styles.pulseRing} /></span>}

      <div ref={marker} className={styles.markerTrack}><AnimatePresence>
        {referral && <motion.div key="referral" className={styles.marker}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(.94)", filter: `blur(${motionTokens.blur.soft}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: duration.exit } }}
          transition={reduced ? { duration: duration.fast } : { ...spring.snappy, delay: markerDelay }}>
          <Tooltip content={`${sourceName[referral.source]} sent ${referral.people} ${referral.people === 1 ? "person" : "people"}`} side="right">
            <button type="button" className={styles.markerBadge} aria-label={`Referral spike from ${sourceName[referral.source]}`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={referral.source} className={styles.markerIcon}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.9)" }}
                  animate={{ opacity: 1, transform: "scale(1)" }}
                  exit={{ opacity: 0, transform: "scale(.9)", transition: { duration: duration.exit } }}
                  transition={reduced ? { duration: duration.fast } : spring.snappy}>
                  <BrandMark source={referral.source} />
                </motion.span>
              </AnimatePresence>
            </button>
          </Tooltip>
          <span className={styles.markerStem} aria-hidden="true" />
        </motion.div>}
      </AnimatePresence></div>

      <span ref={crosshair} className={styles.crosshair} aria-hidden="true" />
      <span ref={node => { if (node) dots.current.set("views", node); }} className={styles.dot} data-series="views" data-hidden={!visible.views || undefined} aria-hidden="true" />
      <span ref={node => { if (node) dots.current.set("people", node); }} className={styles.dot} data-series="people" data-hidden={!visible.people || undefined} aria-hidden="true" />
      <motion.div ref={tip} className={styles.tip} style={{ x: reduced ? tipTarget : tipX }} aria-hidden="true">
        <p className={styles.tipTitle}>{reading?.label ?? ""}</p>
        {visible.people && <p className={styles.tipRow}><span className={styles.tipSwatch} data-series="people" />People<b>{reading?.people ?? 0}</b></p>}
        {visible.views && <p className={styles.tipRow}><span className={styles.tipSwatch} data-series="views" />Views<b>{reading?.views ?? 0}</b></p>}
      </motion.div>
    </div>

    <div className={styles.axis} aria-hidden="true">
      <AnimatePresence initial={false}>
        {data.points.map((_, at) => {
          const isEdge = at === 0 || at === last;
          const isNow = !!data.nowLabel && at === data.now;
          const share = at / last;
          return <motion.span key={`${count}-${at}`} className={styles.tick} style={{ left: `calc(var(--pad) + ${share} * (100% - var(--pad) * 2))`, "--i": at } as React.CSSProperties}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.exit } }}
            transition={{ duration: duration.standard, ease: [...ease.standard], delay: Math.min(at * .01, .24) }}>
            {isNow ? <span className={styles.nowPill}>{data.nowLabel}</span>
              : isEdge ? <span className={styles.edge} data-side={at === 0 ? "start" : "end"}>{at === 0 ? data.edges[0] : data.edges[1]}</span>
              : <span className={styles.tickDot} data-future={at > data.now || undefined} />}
          </motion.span>;
        })}
      </AnimatePresence>
    </div>
    <p className={styles.srOnly}>{`Traffic ${data.edges[0]} to ${data.nowLabel || data.edges[1]}: ${data.stats.people} people and ${data.stats.views} views.`}</p>
  </div>;
}
