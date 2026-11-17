import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Download, Eye, Link2, ListFilter } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Badge } from "@/components/arc/badge/badge";
import { DropdownMenu } from "@/components/arc/dropdown-menu/dropdown-menu";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { approvals as seedApprovals, compact, dataByRange, money, ranges, vendors, type Approval, type RangeData, type RangeId, type SeriesKey } from "./data";
import { Approvals } from "./Approvals";
import { Budgets } from "./Budgets";
import { Monogram } from "./Monogram";
import { ForecastTag, Page, PageToolbar, PillMenu, Region, Stat, Stats, StatsReading } from "./Page";
import { Renewals } from "./Renewals";
import { SpendChart } from "./SpendChart";
import { Transactions } from "./Transactions";
import panel from "./Panel.module.css";
import styles from "./Overview.module.css";

const { spring, stagger } = motionTokens;

export interface OverviewProps { draftSignal: number }

export function Overview({ draftSignal }: OverviewProps) {
  const reduced = useReducedMotion() ?? false;
  const [range, setRange] = useState<RangeId>("quarter");
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ spent: true, forecast: true, budget: true });
  const [active, setActive] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [queue, setQueue] = useState<Approval[]>(seedApprovals);
  const data = dataByRange[range];
  const point = active === null ? null : data.points[active];
  const scrubbing = point !== null;
  // Today and earlier are actual spend; anything after today is a projection.
  const future = active !== null && active > data.now;

  const toggle = (key: SeriesKey) => setVisible(current => {
    const next = { ...current, [key]: !current[key] };
    return next.spent || next.forecast || next.budget ? next : current;
  });

  const pending = queue.reduce((sum, item) => sum + item.amount, 0);
  const used = Math.round((data.stats.spent / data.budget) * 100);
  const forecastGap = data.stats.forecast - data.budget;

  return <Page>
    <PageToolbar title="Overview" meta={data.period}>
      <MorphSelect label="Range" hideLabel value={range} onValueChange={value => setRange(value as RangeId)} searchable={false} items={ranges} />
      <PillMenu><DropdownMenu label="View" icon={<ListFilter size={16} strokeWidth={1.75} />} items={[
        { label: visible.budget ? "Hide budget pace" : "Show budget pace", icon: <Eye size={16} strokeWidth={1.75} />, onSelect: () => toggle("budget") },
        { label: linkCopied ? "Link copied" : "Copy link", icon: <Link2 size={16} strokeWidth={1.75} />, onSelect: () => { void navigator.clipboard?.writeText(location.href); setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 2000); } },
        { label: "Export CSV", icon: <Download size={16} strokeWidth={1.75} />, separatorBefore: true, onSelect: () => downloadCsv(range, data) },
      ]} /></PillMenu>
    </PageToolbar>

    {/* The row is the chart's legend: Spent, Forecast and Budget each switch their own line. While you scrub, the number moves to
        the line under the pointer, so a projection only ever appears under Forecast; the stats that are not in play step back. */}
    <Stats label="Key numbers">
      <Stat label="Spent" swatch="spent" pressed={visible.spent} onClick={() => toggle("spent")} ariaLabel={`Spent line, ${visible.spent ? "shown" : "hidden"} on chart`} dim={scrubbing && future}
        reading={scrubbing ? money(future ? data.stats.spent : point!.spent) : null}
        badge={scrubbing && !future ? <PaceBadge gap={point!.spent - point!.pace} /> : <Badge tone="neutral" size="sm">{data.changes.spent} vs last</Badge>}>
        <AnimatedCounter value={data.stats.spent} prefix="$" animateOnView />
      </Stat>
      <Stat label="Forecast" swatch="forecast" pressed={visible.forecast} onClick={() => toggle("forecast")} ariaLabel={`Forecast line, ${visible.forecast ? "shown" : "hidden"} on chart`} dim={scrubbing && !future}
        reading={scrubbing ? (future ? money(point!.forecast) : "—") : null}
        badge={scrubbing && future ? <PaceBadge gap={point!.forecast - point!.pace} /> : <Badge tone={forecastGap > 0 ? "danger" : "success"} size="sm">{`${compact(Math.abs(forecastGap))} ${forecastGap > 0 ? "over" : "under"}`}</Badge>}>
        <AnimatedCounter value={data.stats.forecast} prefix="$" animateOnView />
      </Stat>
      <Stat label="Budget" swatch="budget" pressed={visible.budget} onClick={() => toggle("budget")} ariaLabel={`Budget line, ${visible.budget ? "shown" : "hidden"} on chart`}
        reading={scrubbing ? money(point!.pace) : null}
        badge={scrubbing ? <Badge tone="neutral" size="sm">Pace</Badge> : <Badge tone={used > 100 ? "danger" : used > 85 ? "warning" : "neutral"} size="sm">{`${used}% used`}</Badge>}>
        <AnimatedCounter value={data.budget} prefix="$" animateOnView />
      </Stat>
      <Stat label="Awaiting approval" kind="jump" ariaLabel="Awaiting approval, jump to approvals" dim={scrubbing} onClick={() => document.getElementById("approvals")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" })}
        badge={<Badge tone={queue.length ? "info" : "success"} size="sm">{queue.length ? `${queue.length} ${queue.length === 1 ? "request" : "requests"}` : "All clear"}</Badge>}>
        <AnimatedCounter value={pending} prefix="$" animateOnView />
      </Stat>
      <AnimatePresence>
        {point && <StatsReading key="reading">{point.label}<ForecastTag shown={future} /></StatsReading>}
      </AnimatePresence>
    </Stats>

    <Region as="section" still className={styles.chart} aria-label="Spend over time">
      <SpendChart data={data} visible={visible} onActiveChange={setActive} />
    </Region>

    <Region className={styles.grid}>
      <Approvals queue={queue} onQueueChange={setQueue} />
      <Budgets />
      <section className={panel.panel} aria-labelledby="vendors-title">
        <header className={panel.head}><h2 id="vendors-title" className={panel.title}>Top vendors</h2><span className={panel.meta}>November</span></header>
        <VendorBars />
      </section>
      <Renewals />
      <Transactions draftSignal={draftSignal} />
    </Region>
  </Page>;
}

/** While scrubbing, the active line's badge says how far it sits from budget pace at that point. */
function PaceBadge({ gap }: { gap: number }) {
  if (Math.abs(gap) < 500) return <Badge tone="neutral" size="sm">On pace</Badge>;
  return <Badge tone={gap > 0 ? "danger" : "success"} size="sm">{`${compact(Math.abs(gap))} ${gap > 0 ? "over" : "under"} pace`}</Badge>;
}

function VendorBars() {
  const reduced = useReducedMotion() ?? false;
  const list = useRef<HTMLUListElement>(null);
  const seen = useInView(list, { once: true, amount: .5 });
  const max = Math.max(...vendors.map(vendor => vendor.spend));
  return <ul ref={list} className={styles.bars}>
    {vendors.map((vendor, index) => {
      const up = vendor.change.startsWith("+") && vendor.change !== "+0%";
      return <li key={vendor.name} className={styles.bar} tabIndex={0}>
        <motion.span className={styles.barFill} aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: seen ? vendor.spend / max : 0 }}
          transition={reduced ? { duration: 0 } : { ...spring.smooth, delay: index * stagger.item * 2 }} />
        <span className={styles.barLabel}><Monogram name={vendor.name} size={20} />{vendor.name}<span className={styles.barCategory}>{vendor.category}</span></span>
        <span className={styles.barValue}>
          <span className={styles.barChange} data-tone={up ? "up" : vendor.change.startsWith("-") ? "down" : undefined}>{vendor.change}</span>
          {compact(vendor.spend)}
        </span>
      </li>;
    })}
  </ul>;
}

function downloadCsv(range: RangeId, data: RangeData) {
  const rows = ["period,spent,forecast,budget_pace", ...data.points.map((point, index) => `${point.label},${index <= data.now ? point.spent : ""},${point.forecast},${point.pace}`)];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `spend-${range}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

