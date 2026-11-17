import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { Activity, ChevronRight, Download, Globe, Link2, ListFilter, Eye } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { DropdownMenu } from "@/components/arc/dropdown-menu/dropdown-menu";
import { FloatingButtonGroup } from "@/components/arc/floating-button-group/floating-button-group";
import { Gauge } from "@/components/arc/gauge/gauge";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { ThemeSwitch, type Theme } from "@/components/arc/theme-switch/theme-switch";
import { BrandMark } from "./BrandMark";
import { dataByRange, liveVisitors, ranges, sites, type RangeData, type RangeId, type Row, type SeriesKey } from "./data";
import { TrafficChart } from "./TrafficChart";
import styles from "./Dashboard.module.css";

const { duration, ease, spring, stagger, blur } = motionTokens;

/** The page's one orchestrated entrance: each region rises out of a soft blur, a beat after the one above it. */
const page: Variants = { hidden: {}, shown: { transition: { staggerChildren: .07, delayChildren: .05 } } };
const region: Variants = {
  hidden: { opacity: 0, transform: "translateY(10px)", filter: `blur(${blur.soft}px)` },
  shown: { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)", transition: { duration: duration.considered, ease: [...ease.enter] } },
};
const still: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: duration.standard } } };

export function Dashboard() {
  const reduced = useReducedMotion() ?? false;
  const [range, setRange] = useState<RangeId>("today");
  const [site, setSite] = useState("ledger");
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ people: true, views: false });
  const [active, setActive] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [linkCopied, setLinkCopied] = useState(false);
  const live = useLiveVisitors();
  const [section, setSection] = useDockSection();
  const data = dataByRange[range];
  const point = active === null ? null : data.points[active];

  const toggle = (key: SeriesKey) => setVisible(current => {
    const next = { ...current, [key]: !current[key] };
    return next.people || next.views ? next : current;
  });

  const changeTheme = (next: Theme) => {
    const apply = () => { document.documentElement.dataset.theme = next; setTheme(next); };
    try { localStorage.setItem("theme", next); } catch { /* storage can be unavailable; the theme still applies */ }
    const transition = (document as Document & { startViewTransition?: (update: () => void) => unknown }).startViewTransition;
    if (transition && !reduced) transition.call(document, apply); else apply();
  };

  const variants = reduced ? still : region;

  return <>
    <motion.main className={styles.page} variants={page} initial="hidden" animate="shown">
      <motion.header className={styles.header} variants={variants}>
        <div className={styles.brand}>
          <Logo />
          <MorphSelect label="Site" hideLabel value={site} onValueChange={setSite} searchable={false}
            items={sites.map(item => ({ ...item, icon: <SiteMark name={item.value} /> }))} />
        </div>
        <div className={styles.headerTools}>
          <ThemeSwitch theme={theme} variant="eclipse" iconOnly onThemeChange={next => changeTheme(next)} />
          <Button className={styles.trial}>Start 14 day free trial</Button>
        </div>
      </motion.header>

      <motion.div className={styles.toolbar} variants={variants}>
        <MorphSelect label="Range" hideLabel value={range} onValueChange={value => setRange(value as RangeId)} searchable={false} items={ranges} />
        <DropdownMenu label="View" icon={<ListFilter size={16} strokeWidth={1.75} />} items={[
          { label: visible.views ? "Hide views" : "Compare views", icon: <Eye size={16} strokeWidth={1.75} />, onSelect: () => toggle("views") },
          { label: linkCopied ? "Link copied" : "Copy link", icon: <Link2 size={16} strokeWidth={1.75} />, onSelect: () => { void navigator.clipboard?.writeText(location.href); setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 2000); } },
          { label: "Download CSV", icon: <Download size={16} strokeWidth={1.75} />, separatorBefore: true, onSelect: () => downloadCsv(range, data) },
        ]} />
      </motion.div>

      <motion.section className={styles.stats} variants={variants} aria-label="Key numbers">
        <Stat label="People" series="people" pressed={visible.people} onToggle={() => toggle("people")} change={data.changes.people} live={point !== null}>
          {point ? <span className={styles.plain}>{point.people}</span> : <AnimatedCounter value={data.stats.people} animateOnView />}
        </Stat>
        <Stat label="Views" series="views" pressed={visible.views} onToggle={() => toggle("views")} change={data.changes.views} live={point !== null}>
          {point ? <span className={styles.plain}>{point.views}</span> : <AnimatedCounter value={data.stats.views} animateOnView />}
        </Stat>
        <Stat label="Bounced" change={data.changes.bounced} lowerIsBetter>
          <AnimatedCounter value={data.stats.bounced} suffix="%" animateOnView />
        </Stat>
        <Stat label="Duration" change={data.changes.duration}>
          <span className={styles.duration}>
            <AnimatedCounter value={Math.floor(data.stats.duration / 60)} suffix="m" animateOnView />
            <AnimatedCounter value={data.stats.duration % 60} suffix="s" animateOnView />
          </span>
        </Stat>
        <AnimatePresence>
          {point && <motion.p key="reading" className={styles.reading}
            initial={{ opacity: 0, transform: "translateY(4px)", filter: `blur(${blur.subtle}px)` }} animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: duration.exit } }} transition={{ duration: duration.fast, ease: [...ease.enter] }}>
            {point.label}
          </motion.p>}
        </AnimatePresence>
      </motion.section>

      <motion.section className={styles.chart} variants={still} aria-label="Traffic">
        <TrafficChart data={data} visible={visible} onActiveChange={setActive} />
      </motion.section>

      <motion.div className={styles.grid} variants={variants}>
        <section className={styles.panel} id="live" aria-labelledby="live-title">
          <header className={styles.panelHead}>
            <h2 id="live-title" className={styles.panelTitle}>
              <span className={styles.liveCount}><AnimatedCounter value={live.count} /></span> {live.count === 1 ? "person" : "people"} <span className={styles.quiet}>in the last 30m</span>
            </h2>
            <Button variant="secondary" size="sm" className={styles.chip}>Realtime<ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" /></Button>
          </header>
          <LiveBars bars={live.bars} />
          <ul className={styles.feed} aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {live.feed.length === 0 && <motion.li key="waiting" className={styles.waiting} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.exit } }}>
                <span className={styles.waitingDot} aria-hidden="true" />Waiting for visitors
              </motion.li>}
              {live.feed.map(visitor => <motion.li key={visitor.id} layout={!reduced} className={styles.visitor}
                initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(-12px) scale(.98)", filter: `blur(${blur.soft}px)` }}
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" }}
                exit={{ opacity: 0, transition: { duration: duration.exit } }}
                transition={reduced ? { duration: duration.fast } : spring.smooth}>
                <span className={styles.flag} aria-hidden="true">{visitor.flag}</span>
                <span className={styles.visitorPage}>{visitor.page}</span>
                <span className={styles.visitorPlace}>{visitor.place}</span>
                <span className={styles.visitorTime}>just now</span>
              </motion.li>)}
            </AnimatePresence>
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="score-title">
          <header className={styles.panelHead}>
            <h2 id="score-title" className={styles.panelTitle}>Experience score</h2>
            <Button variant="ghost" size="sm" className={styles.chip}>Performance<ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" /></Button>
          </header>
          <div className={styles.score}>
            <Gauge value={data.score} label="Core Web Vitals" detail={`Based on ${data.stats.views} real visits`}
              thresholds={[{ from: 0, tone: "danger", label: "Poor" }, { from: 50, tone: "warning", label: "Needs work" }, { from: 90, tone: "success", label: "Great" }]} />
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="pages-title">
          <header className={styles.panelHead}><h2 id="pages-title" className={styles.panelTitle}>Pages</h2><span className={styles.quiet}>Views</span></header>
          <BarList rows={data.pages} />
        </section>

        <section className={styles.panel} aria-labelledby="sources-title">
          <header className={styles.panelHead}><h2 id="sources-title" className={styles.panelTitle}>Sources</h2><span className={styles.quiet}>People</span></header>
          <BarList rows={data.sources} icon={label => label === "Google" ? <BrandMark source="google" size={14} /> : label === "X" ? <BrandMark source="x" size={14} /> : label === "GitHub" ? <BrandMark source="github" size={14} /> : <Globe size={14} strokeWidth={1.75} />} />
        </section>
      </motion.div>
    </motion.main>

    <motion.div className={styles.dock}
      initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px) scale(.96)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={reduced ? { duration: duration.standard } : { ...spring.smooth, delay: .7 }}>
      <FloatingButtonGroup variant="floating" label="Dashboard" className={styles.dockGroup} items={[
        { id: "overview", label: "Overview", icon: <Activity size={16} strokeWidth={1.75} />, iconOnly: true, pressed: section === "overview" },
        { id: "live", label: `${live.count} online`, icon: <Globe className={styles.liveGlobe} size={16} strokeWidth={1.75} />, reserveLabels: ["99 online"], pressed: section === "live" },
      ]} onAction={id => {
        setSection(id === "live" ? "live" : "overview");
        if (id === "live") document.getElementById("live")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }} />
    </motion.div>
  </>;
}

function Stat({ label, series, pressed, onToggle, change, lowerIsBetter, live, children }: { label: string; series?: SeriesKey; pressed?: boolean; onToggle?: () => void; change: string; lowerIsBetter?: boolean; live?: boolean; children: React.ReactNode }) {
  const direction = change.startsWith("+") ? 1 : change.startsWith("-") ? -1 : 0;
  const tone = direction === 0 ? "neutral" : (direction > 0) !== !!lowerIsBetter ? "success" : "danger";
  const body = <>
    <span className={styles.statLabel}>{label}{series && <span className={styles.statDot} data-series={series} data-on={pressed || undefined} aria-hidden="true" />}</span>
    <span className={styles.statValue}>{children}</span>
    <span className={styles.statChange} data-hidden={live || undefined}><Badge tone={tone} size="sm">{change}</Badge></span>
  </>;
  if (!series) return <div className={styles.stat}>{body}</div>;
  return <button type="button" className={styles.stat} data-interactive aria-pressed={pressed} onClick={onToggle} aria-label={`${label}, ${pressed ? "shown" : "hidden"} on chart`}>{body}</button>;
}

function BarList({ rows, icon }: { rows: Row[]; icon?: (label: string) => React.ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const list = useRef<HTMLUListElement>(null);
  const seen = useInView(list, { once: true, amount: .5 });
  const max = Math.max(1, ...rows.map(row => row.value));
  return <ul ref={list} className={styles.bars}>
    <AnimatePresence initial={false} mode="popLayout">
      {rows.map((row, index) => <motion.li key={row.label} layout={!reduced} className={styles.bar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.exit } }}
        transition={reduced ? { duration: 0 } : spring.smooth}>
        <motion.span className={styles.barFill} aria-hidden="true"
          initial={{ scaleX: 0 }} animate={{ scaleX: seen ? row.value / max : 0 }}
          transition={reduced ? { duration: 0 } : { ...spring.smooth, delay: index * stagger.item * 2 }} />
        <span className={styles.barLabel}>{icon && <span className={styles.barIcon}>{icon(row.label)}</span>}{row.label}</span>
        <span className={styles.barValue}><AnimatedCounter value={row.value} /></span>
      </motion.li>)}
    </AnimatePresence>
  </ul>;
}

/** Thirty one-minute columns. A new visitor lifts the latest column on a spring. */
function LiveBars({ bars }: { bars: number[] }) {
  const reduced = useReducedMotion() ?? false;
  const max = Math.max(3, ...bars);
  return <div className={styles.liveBars} aria-hidden="true">
    {bars.map((value, index) => <span key={index} className={styles.liveBar} data-latest={index === bars.length - 1 || undefined}>
      <motion.span className={styles.liveBarFill} initial={false} animate={{ scaleY: value / max }}
        transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: .5, bounce: 0 }} />
    </span>)}
  </div>;
}

type DockSection = "overview" | "live";

/** The dock marks where you are: a click selects at once, and scrolling keeps it true. Live is selected while the live card crosses the middle of the screen. */
function useDockSection() {
  const [section, setSection] = useState<DockSection>("overview");
  useEffect(() => {
    const card = document.getElementById("live");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setSection(entry?.isIntersecting ? "live" : "overview"), { rootMargin: "-45% 0px -45% 0px" });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  return [section, setSection] as const;
}

type Visitor = (typeof liveVisitors)[number] & { id: number };

/** Simulated realtime: visitors arrive on a fixed rhythm once the page is open, so the first render is always the same. */
function useLiveVisitors() {
  const [feed, setFeed] = useState<Visitor[]>([]);
  const [bars, setBars] = useState<number[]>(() => Array(30).fill(0));
  const [count, setCount] = useState(0);
  const next = useRef(0);
  useEffect(() => {
    const gaps = [2600, 4200, 3400, 5200, 3800, 6000];
    let timer = 0;
    const arrive = () => {
      const at = next.current++;
      const visitor = { ...liveVisitors[at % liveVisitors.length]!, id: at };
      setFeed(current => [visitor, ...current].slice(0, 3));
      setCount(current => Math.min(current + 1, 12));
      setBars(current => { const copy = [...current]; if (at % 2 === 1) { copy.shift(); copy.push(0); } copy[copy.length - 1]! += 1; return copy; });
      if (at < 11) timer = window.setTimeout(arrive, gaps[at % gaps.length]);
    };
    timer = window.setTimeout(arrive, gaps[0]);
    return () => window.clearTimeout(timer);
  }, []);
  return { feed, bars, count };
}

function downloadCsv(range: RangeId, data: RangeData) {
  const rows = ["slot,people,views", ...data.points.slice(0, data.now + 1).map(point => `${point.key},${point.people},${point.views}`)];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `traffic-${range}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

function Logo() {
  return <svg className={styles.logo} width="44" height="36" viewBox="0 0 44 36" role="img" aria-label="Pulse">
    <ellipse cx="22" cy="18" rx="16" ry="13" fill="none" stroke="currentColor" strokeWidth="7.5" />
  </svg>;
}

function SiteMark({ name }: { name: string }) {
  return <span className={styles.siteMark} data-site={name} style={{ "--turn": `${sites.findIndex(site => site.value === name) * 120}deg` } as CSSProperties} aria-hidden="true" />;
}
