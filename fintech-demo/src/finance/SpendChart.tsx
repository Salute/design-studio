import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { compact, money, type RangeData, type SeriesKey } from "./data";
import { Monogram } from "./Monogram";
import styles from "./SpendChart.module.css";

/** Samples per line. Every shape has the same count, so any two shapes morph point for point. */
const SAMPLES = 200;
const HEADROOM = 1.22;
const TOP = 12;

type Shape = { values: number[]; start: number; end: number };
type LineKey = "spent" | "forecast" | "pace";
type Track = { from: Shape; to: Shape; shape: Shape; presence: number };
const LINES: LineKey[] = ["pace", "forecast", "spent"];

const { spring, duration, ease, blur } = motionTokens;
/** Time-defined springs drop velocity when retargeted, so the morph runs on the same spring written as stiffness and damping. */
const physical = ({ visualDuration, bounce }: { visualDuration: number; bounce: number }) => {
  const root = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring" as const, stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta: .0005, restSpeed: .001 };
};
const settle = physical(spring.smooth);
const glide = physical(spring.snappy);
const draw = { duration: 1.2, ease: [...ease.inOut] } as const;

/** Monotone cubic interpolation (Fritsch–Carlson): smooth like a spline, but a running total never dips between two days. */
function monotone(ys: number[]) {
  const n = ys.length;
  if (n < 2) return () => ys[0] ?? 0;
  const delta = ys.slice(1).map((y, i) => y - ys[i]!);
  const m = ys.map((_, i) => i === 0 ? delta[0]! : i === n - 1 ? delta[n - 2]! : delta[i - 1]! * delta[i]! <= 0 ? 0 : (delta[i - 1]! + delta[i]!) / 2);
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i]! / delta[i]!, b = m[i + 1]! / delta[i]!, s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * delta[i]!; m[i + 1] = t * b * delta[i]!; }
  }
  return (x: number) => {
    const i = Math.min(n - 2, Math.max(0, Math.floor(x)));
    const t = Math.min(1, Math.max(0, x - i)), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * m[i + 1]!;
  };
}

function shapeFor(ys: number[], from: number, to: number): Shape {
  const last = Math.max(1, ys.length - 1);
  const curve = monotone(ys);
  return { values: Array.from({ length: SAMPLES + 1 }, (_, s) => curve(from + ((to - from) * s) / SAMPLES)), start: from / last, end: to / last };
}

function shapesFor(data: RangeData): Record<LineKey, Shape> {
  const last = data.points.length - 1;
  return {
    spent: shapeFor(data.points.map(p => p.spent), 0, data.now),
    forecast: shapeFor(data.points.map(p => p.forecast), data.now, last),
    pace: shapeFor(data.points.map(p => p.pace), 0, last),
  };
}

const mix = (a: Shape, b: Shape, k: number): Shape => ({
  values: b.values.map((v, i) => a.values[i]! + (v - a.values[i]!) * k),
  start: a.start + (b.start - a.start) * k,
  end: a.end + (b.end - a.end) * k,
});

function valueAt(shape: Shape, fraction: number) {
  const span = shape.end - shape.start;
  if (span <= 0) return shape.values[0] ?? 0;
  const at = Math.min(1, Math.max(0, (fraction - shape.start) / span)) * SAMPLES;
  const low = Math.floor(at), high = Math.min(SAMPLES, low + 1);
  return shape.values[low]! + (shape.values[high]! - shape.values[low]!) * (at - low);
}

/** When an in-out cubic draw reaches a share of the width, so the marker lands as the line arrives under it. */
const timeToReach = (share: number) => share < .5 ? Math.cbrt(share / 4) : 1 - Math.cbrt(2 * (1 - share)) / 2;

export interface SpendChartProps {
  data: RangeData;
  visible: Record<SeriesKey, boolean>;
  onActiveChange?: (index: number | null) => void;
}

export function SpendChart({ data, visible, onActiveChange }: SpendChartProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, amount: .25 });
  const size = useRef({ w: 0, h: 0 });
  const [width, setWidth] = useState(0);
  const pad = width < 640 ? 20 : 44;

  const paths = useRef(new Map<LineKey, SVGPathElement>());
  const areaPath = useRef<SVGPathElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const nowLine = useRef<HTMLSpanElement>(null);
  const pulse = useRef<HTMLSpanElement>(null);
  const budgetCap = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const crosshair = useRef<HTMLSpanElement>(null);
  const dots = useRef(new Map<"spent" | "pace", HTMLSpanElement>());
  const tip = useRef<HTMLDivElement>(null);

  const count = data.points.length;
  const last = Math.max(1, count - 1);
  const targets = useRef<Record<LineKey, Shape>>(shapesFor(data));
  targets.current = shapesFor(data);

  // Each line has its own switch in the stats row: Spent, Forecast and Budget.
  const seriesOf = (key: LineKey): SeriesKey => key === "pace" ? "budget" : key;
  const presenceOf = (key: LineKey) => visible[seriesOf(key)] ? 1 : 0;
  const peak = Math.max(1, ...LINES.filter(key => presenceOf(key)).flatMap(key => targets.current[key].values));

  const tracks = useRef<Record<LineKey, Track> | null>(null);
  if (!tracks.current) {
    const make = (key: LineKey): Track => ({ from: targets.current[key], to: targets.current[key], shape: targets.current[key], presence: presenceOf(key) });
    tracks.current = { spent: make("spent"), forecast: make("forecast"), pace: make("pace") };
  }
  const scale = useMotionValue(peak * HEADROOM);
  const drawn = useMotionValue(0);
  const markerAt = useMotionValue(data.spike.index / last);
  const cursor = useMotionValue(0);
  const tipTarget = useMotionValue(0);
  const tipX = useSpring(tipTarget, { stiffness: glide.stiffness, damping: glide.damping });

  const [active, setActive] = useState<number | null>(null);
  const [seen, setSeen] = useState(data);
  if (seen !== data) { setSeen(data); setActive(null); }
  const index = active === null ? null : Math.min(active, last);

  // One painter writes every attribute: morphs, the draw-in, the scale, the marker and the crosshair all repaint through here.
  const paint = useCallback(() => {
    const { w, h } = size.current;
    const all = tracks.current;
    if (!w || !h || !all) return;
    const span = w - pad * 2;
    const max = scale.get() || 1;
    const x = (fraction: number) => pad + fraction * span;
    const y = (value: number) => TOP + (1 - value / max) * (h - TOP);
    const lineOf = (key: LineKey) => {
      const { shape, presence } = all[key];
      const points = shape.values.map((value, s) => `${x(shape.start + ((shape.end - shape.start) * s) / SAMPLES).toFixed(1)},${y(value * presence).toFixed(1)}`);
      return points;
    };
    for (const key of LINES) {
      const points = lineOf(key);
      // The actual line starts at the left edge of the screen, like the traffic chart; forecast and pace start where they start.
      const lead = key === "spent" ? `M0,${y(all.spent.shape.values[0]! * all.spent.presence).toFixed(1)}L` : "M";
      const d = `${lead}${points.join("L")}`;
      const path = paths.current.get(key);
      path?.setAttribute("d", d);
      if (path) path.style.opacity = String(all[key].presence);
      if (key === "spent") areaPath.current?.setAttribute("d", `${d}L${x(all.spent.shape.end).toFixed(1)},${h}L0,${h}Z`);
    }
    const spent = all.spent;
    const endX = x(spent.shape.end);
    clip.current?.setAttribute("width", String(drawn.get() * (w + 4)));
    if (nowLine.current) nowLine.current.style.transform = `translateX(${endX}px)`;
    // Today's point joins the actual line to the forecast, so it stays put while either of them is showing.
    if (pulse.current) pulse.current.style.transform = `translate(${endX}px, ${y(spent.shape.values[SAMPLES]! * Math.max(spent.presence, all.forecast.presence))}px)`;
    if (budgetCap.current) budgetCap.current.style.transform = `translate(${x(1)}px, ${y(all.pace.shape.values[SAMPLES]! * all.pace.presence)}px)`;
    if (marker.current) {
      const at = markerAt.get();
      marker.current.style.transform = `translate(${x(at)}px, ${y(valueAt(spent.shape, at) * spent.presence) - 58}px)`;
    }
    const at = cursor.get();
    const cx = x(at);
    if (crosshair.current) crosshair.current.style.transform = `translateX(${cx}px)`;
    const actual = at <= spent.shape.end + 1e-6 ? spent : all.forecast;
    const spentDot = dots.current.get("spent"), paceDot = dots.current.get("pace");
    if (spentDot) { spentDot.style.transform = `translate(${cx}px, ${y(valueAt(actual.shape, at) * actual.presence)}px)`; spentDot.dataset.projected = actual === spent ? "" : "true"; }
    if (paceDot) paceDot.style.transform = `translate(${cx}px, ${y(valueAt(all.pace.shape, at) * all.pace.presence)}px)`;
    const tw = tip.current?.offsetWidth ?? 0;
    tipTarget.set(cx + 16 + tw > w - 8 ? cx - 16 - tw : cx + 16);
  }, [cursor, drawn, markerAt, pad, scale, tipTarget]);

  useMotionValueEvent(scale, "change", paint);
  useMotionValueEvent(drawn, "change", paint);
  useMotionValueEvent(markerAt, "change", paint);
  useMotionValueEvent(cursor, "change", paint);
  useLayoutEffect(paint);

  useLayoutEffect(() => {
    const node = plot.current;
    if (!node) return;
    const read = () => { size.current = { w: node.clientWidth, h: node.clientHeight }; setWidth(node.clientWidth); paint(); };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [paint]);

  // A new range morphs every line from the shape on screen: the month stretches into a quarter instead of redrawing.
  const signature = `${data.now}|${data.points.map(p => p.forecast).join(",")}`;
  useEffect(() => {
    const all = tracks.current!;
    for (const key of LINES) all[key] = { ...all[key], from: all[key].shape, to: targets.current[key] };
    if (reduced) { for (const key of LINES) all[key].shape = all[key].to; paint(); return; }
    const controls = animate(0, 1, { ...settle, onUpdate: k => { for (const key of LINES) all[key].shape = mix(all[key].from, all[key].to, k); paint(); } });
    return () => controls.stop();
  }, [signature, paint, reduced]);

  // A series that is switched off flattens into the baseline as it fades; the scale follows the lines on show.
  useEffect(() => {
    const all = tracks.current!;
    const controls = LINES.map(key => {
      const to = visible[key === "pace" ? "budget" : key] ? 1 : 0;
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
    const to = data.spike.index / last;
    if (reduced) { markerAt.jump(to); return; }
    const controls = animate(markerAt, to, settle);
    return () => controls.stop();
  }, [data.spike.index, last, markerAt, reduced]);

  const [isDrawn, setIsDrawn] = useState(false);
  useEffect(() => {
    if (reduced) { drawn.jump(1); setIsDrawn(true); return; }
    if (!inView) return;
    const controls = animate(drawn, 1, { ...draw, delay: .2, onComplete: () => setIsDrawn(true) });
    return () => controls.stop();
  }, [drawn, inView, reduced]);

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
    return Math.min(last, Math.max(0, Math.round(fraction * last)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = index ?? data.now;
    const next = ({ ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: last } as Record<string, number>)[event.key];
    if (event.key === "Escape") { setActive(null); return; }
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  };

  const reading = index === null ? null : data.points[index];
  const projected = index !== null && index > data.now;
  const value = reading ? (projected ? reading.forecast : reading.spent) : 0;
  const gap = reading ? value - reading.pace : 0;
  const lineShown = projected ? visible.forecast : visible.spent;
  const spike = data.spike;
  const markerDelay = !isDrawn ? .2 + draw.duration * timeToReach(spike.index / last) : 0;

  return <div ref={root} className={styles.root} style={{ "--pad": `${pad}px` } as CSSProperties} data-drawn={isDrawn || undefined}>
    <div ref={plot} className={styles.plot} data-scrubbing={index !== null || undefined}
      role="slider" tabIndex={0} aria-label="Cumulative spend" aria-valuemin={1} aria-valuemax={count} aria-valuenow={(index ?? data.now) + 1}
      aria-valuetext={reading ? `${reading.label}: ${money(value)} ${projected ? "projected" : "spent"}, budget pace ${money(reading.pace)}` : `${money(data.stats.spent)} spent of ${money(data.budget)}`}
      onPointerDown={event => { if (event.pointerType !== "mouse") event.currentTarget.setPointerCapture(event.pointerId); setActive(pointAt(event.clientX)); }}
      onPointerMove={event => { if (event.pointerType === "mouse" || event.buttons) setActive(pointAt(event.clientX)); }}
      onPointerUp={event => { if (event.pointerType !== "mouse") setActive(null); }}
      onPointerLeave={(event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "mouse") setActive(null); }}
      onPointerCancel={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}>
      <svg className={styles.svg} width="100%" height="100%" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="spend-draw" clipPathUnits="userSpaceOnUse"><rect ref={clip} x={0} y={-40} width={0} height="200%" /></clipPath>
          <linearGradient id="spend-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity=".18" />
            <stop offset="60%" stopColor="var(--series-1)" stopOpacity=".04" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spend-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity=".5" />
            <stop offset="40%" stopColor="var(--series-1)" stopOpacity=".85" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g clipPath="url(#spend-draw)">
          <path ref={areaPath} className={styles.area} fill="url(#spend-area)" />
          <path ref={node => { if (node) paths.current.set("pace", node); }} className={styles.pace} />
          <path ref={node => { if (node) paths.current.set("forecast", node); }} className={styles.forecast} />
          <path ref={node => { if (node) paths.current.set("spent", node); }} className={styles.spent} stroke="url(#spend-stroke)" />
        </g>
      </svg>

      <span ref={nowLine} className={styles.nowLine} aria-hidden="true" />
      <span ref={pulse} className={styles.pulse} data-hidden={!visible.spent && !visible.forecast || undefined} aria-hidden="true"><span className={styles.pulseRing} /></span>
      <span ref={budgetCap} className={styles.budgetCap} data-hidden={!visible.budget || undefined} aria-hidden="true">
        <span className={styles.budgetLabel}>Budget {compact(data.budget)}</span>
      </span>

      <div ref={marker} className={styles.markerTrack} data-hidden={!visible.spent || undefined}><AnimatePresence>
        {inView && <motion.div key="spike" className={styles.marker}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(.94)", filter: `blur(${blur.soft}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: duration.exit } }}
          transition={reduced ? { duration: duration.fast } : { ...spring.snappy, delay: markerDelay }}>
          <Tooltip content={`${spike.vendor} · ${money(spike.amount)} · ${spike.note}`} side="top">
            <button type="button" className={styles.markerBadge} aria-label={`Largest charge: ${spike.vendor}, ${money(spike.amount)}`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={spike.vendor} className={styles.markerIcon}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.85)", filter: `blur(${blur.subtle}px)` }}
                  animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
                  exit={{ opacity: 0, transform: "scale(.85)", transition: { duration: duration.exit } }}
                  transition={reduced ? { duration: duration.fast } : spring.snappy}>
                  <Monogram name={spike.vendor} size={22} />
                </motion.span>
              </AnimatePresence>
            </button>
          </Tooltip>
          <span className={styles.markerStem} aria-hidden="true" />
        </motion.div>}
      </AnimatePresence></div>

      <span ref={crosshair} className={styles.crosshair} aria-hidden="true" />
      <span ref={node => { if (node) dots.current.set("pace", node); }} className={styles.dot} data-series="pace" data-hidden={!visible.budget || undefined} aria-hidden="true" />
      <span ref={node => { if (node) dots.current.set("spent", node); }} className={styles.dot} data-series="spent" data-hidden={!(projected ? visible.forecast : visible.spent) || undefined} aria-hidden="true" />
      <motion.div ref={tip} className={styles.tip} style={{ x: reduced ? tipTarget : tipX }} aria-hidden="true">
        <p className={styles.tipTitle}>{reading?.label ?? ""}{projected && <span className={styles.tipTag}>Forecast</span>}</p>
        {lineShown && <p className={styles.tipRow}><span className={styles.tipSwatch} data-series={projected ? "forecast" : "spent"} />{projected ? "Projected" : "Spent"}<b>{money(value)}</b></p>}
        {visible.budget && <p className={styles.tipRow}><span className={styles.tipSwatch} data-series="pace" />Budget pace<b>{money(reading?.pace ?? 0)}</b></p>}
        {lineShown && visible.budget && <p className={styles.tipDelta} data-tone={gap > 0 ? "over" : "under"}>{compact(Math.abs(gap))} {gap > 0 ? "over" : "under"} pace</p>}
      </motion.div>
    </div>

    <div className={styles.axis} aria-hidden="true">
      <AnimatePresence initial={false}>
        {data.points.map((_, at) => {
          const isEdge = at === 0 || at === last;
          const isNow = at === data.now;
          return <motion.span key={`${count}-${at}`} className={styles.tick} style={{ left: `calc(var(--pad) + ${at / last} * (100% - var(--pad) * 2))` }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.exit } }}
            transition={{ duration: duration.standard, ease: [...ease.standard], delay: Math.min(at * .01, .24) }}>
            {isNow ? <span className={styles.nowPill}>{data.nowLabel}</span>
              : isEdge ? <span className={styles.edge} data-side={at === 0 ? "start" : "end"}>{data.edges[at === 0 ? 0 : 1]}</span>
              : <span className={styles.tickDot} data-future={at > data.now || undefined} data-active={index === at || undefined} />}
          </motion.span>;
        })}
      </AnimatePresence>
    </div>
    <p className={styles.srOnly}>{`Spend ${data.edges[0]} to ${data.edges[1]}: ${money(data.stats.spent)} spent so far, forecast ${money(data.stats.forecast)} against a budget of ${money(data.budget)}.`}</p>
  </div>;
}
