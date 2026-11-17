import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge } from "@/components/arc/badge/badge";
import { ChipGroup } from "@/components/arc/chip-group/chip-group";
import { Drawer, DrawerContent, useDrawerItem } from "@/components/arc/drawer/drawer";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { compact, money } from "../data";
import { days, ledger, monthLabels, vendorCategories, vendorRecords, type VendorRecord } from "../ledger";
import { Monogram } from "../Monogram";
import { NoResults, Page, PageToolbar, PillSearch, Region, Stat, Stats } from "../Page";
import { hrefFor } from "../routes";
import styles from "./VendorsPage.module.css";

const { duration, ease, spring, blur, stagger } = motionTokens;
type Sort = "spend" | "growth" | "name";
const sorts = [{ value: "spend", label: "Most spend" }, { value: "growth", label: "Fastest growing" }, { value: "name", label: "Name A–Z" }];
const statusBadge = { review: { tone: "warning", label: "Review" }, new: { tone: "info", label: "New" } } as const;

export function VendorsPage() {
  const reduced = useReducedMotion() ?? false;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("spend");
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = vendorRecords.filter(vendor => (!category.length || category.includes(vendor.category))
      && words.every(word => `${vendor.name} ${vendor.category} ${vendor.owner}`.toLowerCase().includes(word)));
    return [...list].sort((a, b) => sort === "spend" ? b.quarter - a.quarter : sort === "growth" ? b.change - a.change : a.name.localeCompare(b.name));
  }, [query, category, sort]);

  const total = vendorRecords.reduce((sum, vendor) => sum + vendor.quarter, 0);
  const fastest = [...vendorRecords].sort((a, b) => b.change - a.change)[0]!;
  const review = vendorRecords.filter(vendor => vendor.status === "review");
  const open = vendorRecords.find(vendor => vendor.id === openId) ?? null;
  const shownVendor = useDrawerItem(open);

  return <Page>
    <PageToolbar title="Vendors" meta={`${vendorRecords.length} active`}>
      <PillSearch label="Search vendors" value={query} onValueChange={setQuery} placeholder="Search vendors" />
      <MorphSelect label="Sort" hideLabel align="end" value={sort} searchable={false} items={sorts} onValueChange={value => setSort(value as Sort)} />
    </PageToolbar>

    <Stats label="Vendor numbers">
      <Stat label="Q4 vendor spend" badge={<Badge tone="neutral" size="sm">+7.2% vs Q3</Badge>}><AnimatedCounter value={total} prefix="$" animateOnView /></Stat>
      <Stat label="Active vendors" badge={<Badge tone="info" size="sm">3 new this quarter</Badge>}><AnimatedCounter value={vendorRecords.length} animateOnView /></Stat>
      <Stat label="Growing fastest" badge={<Badge tone="danger" size="sm">{`+${fastest.change}% vs Q3`}</Badge>}><span>{fastest.name}</span></Stat>
      <Stat label="Under review" badge={<Badge tone="warning" size="sm">{review.map(vendor => vendor.name).join(", ")}</Badge>}><AnimatedCounter value={review.length} animateOnView /></Stat>
    </Stats>

    <Region className={styles.filters}>
      <ChipGroup label="Category" multiple={false} value={category} onValueChange={setCategory} options={vendorCategories.filter(name => name !== "All").map(name => ({ value: name, label: name }))} />
    </Region>

    {/* Sorting and filtering are occasional, so the cards glide to their new places: you can follow a vendor as the grid reorders. */}
    <Region as="section" className={styles.grid} aria-label="Vendors">
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((vendor, index) => <motion.button key={vendor.id} type="button" layout={!reduced} className={styles.card} onClick={() => setOpenId(vendor.id)}
          aria-label={`${vendor.name}, ${money(vendor.quarter)} this quarter. Open details`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.98)" }} animate={{ opacity: 1, transform: "scale(1)" }}
          exit={{ opacity: 0, transform: reduced ? "scale(1)" : "scale(.98)", transition: { duration: .15, ease: [...ease.standard] } }}
          transition={reduced ? { duration: duration.fast } : { ...spring.smooth, opacity: { duration: .2, ease: [...ease.enter] } }}>
          <span className={styles.cardHead}>
            <Monogram name={vendor.name} size={36} />
            <span className={styles.cardName}><b>{vendor.name}</b><span>{vendor.category}</span></span>
            {vendor.status !== "active" && <Badge tone={statusBadge[vendor.status].tone} size="sm">{statusBadge[vendor.status].label}</Badge>}
          </span>
          <span className={styles.cardSpend}>
            <span className={styles.amount}>{compact(vendor.quarter)}</span>
            <span className={styles.change} data-tone={vendor.change > 0 ? "up" : vendor.change < 0 ? "down" : undefined}>{vendor.change > 0 ? "+" : ""}{vendor.change}%</span>
          </span>
          <Trend values={vendor.monthly} delay={index * stagger.item} />
          <span className={styles.cardFoot}>
            <span className={styles.owner}><Avatar name={vendor.owner} size="sm" />{vendor.owner}</span>
            <span className={styles.terms}>{vendor.terms}</span>
          </span>
        </motion.button>)}
        {shown.length === 0 && <NoResults key="none" onReset={() => { setQuery(""); setCategory([]); }} resetLabel="Show all vendors">
          No vendors match {query ? <>“{query}”</> : "this category"}.
        </NoResults>}
      </AnimatePresence>
    </Region>

    <Drawer open={open !== null} onOpenChange={next => { if (!next) setOpenId(null); }}>
      {shownVendor && <DrawerContent title={shownVendor.name} description={`${shownVendor.category} · customer since ${shownVendor.since}`}>
        <VendorDetail vendor={shownVendor} />
      </DrawerContent>}
    </Drawer>
  </Page>;
}

/** Twelve months of spend as a soft line that draws itself the first time the card is seen. November is still running, so it ends in a dot. */
function Trend({ values, delay }: { values: number[]; delay: number }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: .6 });
  const max = Math.max(...values, 1);
  const w = 200, h = 40;
  const points = values.map((value, index) => [(index / (values.length - 1)) * w, h - 3 - (value / max) * (h - 8)] as const);
  const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const last = points[points.length - 1]!;
  // The svg stretches to the card's width, so the end dot is an HTML element placed at the line's end; it stays round.
  return <span className={styles.trendWrap}>
    <svg ref={ref} className={styles.trend} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <motion.path d={d} fill="none" vectorEffect="non-scaling-stroke" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: seen ? 1 : 0 }}
        transition={{ duration: .7, ease: [...ease.inOut], delay: .15 + delay }} />
    </svg>
    <motion.span className={styles.trendDot} style={{ top: `${(last[1] / h) * 100}%` }} aria-hidden="true"
      initial={{ opacity: 0 }} animate={{ opacity: seen ? 1 : 0 }} transition={{ duration: duration.fast, delay: reduced ? 0 : .8 + delay }} />
  </span>;
}

function VendorDetail({ vendor }: { vendor: VendorRecord }) {
  const reduced = useReducedMotion() ?? false;
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...vendor.monthly, 1);
  const recent = ledger.filter(tx => tx.vendor === vendor.name).slice(0, 4);
  const year = vendor.monthly.reduce((sum, value) => sum + value, 0) * 1000;
  const reading = hover === null ? null : { label: `${monthLabels[hover]}${hover === 11 ? " so far" : ""}`, value: money(vendor.monthly[hover]! * 1000) };

  return <div className={styles.detail}>
    <div className={styles.detailHero}>
      <Monogram name={vendor.name} size={44} />
      <div>
        <p className={styles.detailAmount}>{money(vendor.quarter)}</p>
        <p className={styles.detailSub}>this quarter · <span data-tone={vendor.change > 0 ? "up" : vendor.change < 0 ? "down" : undefined}>{vendor.change > 0 ? "+" : ""}{vendor.change}% vs Q3</span></p>
      </div>
    </div>

    <section aria-label="Monthly spend">
      <div className={styles.barsHead}>
        <h3 className={styles.sectionTitle}>Last 12 months</h3>
        <span className={styles.barsReading}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={reading?.label ?? "total"} initial={{ opacity: 0, filter: `blur(${blur.subtle}px)` }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, transition: { duration: .1 } }} transition={{ duration: .15, ease: [...ease.enter] }}>
              {reading ? <>{reading.label} <b>{reading.value}</b></> : <>Total <b>{money(year)}</b></>}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <div className={styles.bars} onPointerLeave={() => setHover(null)}>
        {vendor.monthly.map((value, index) => <span key={index} className={styles.barCol} data-hover={hover === index || undefined} data-dim={hover !== null && hover !== index || undefined}
          onPointerEnter={() => setHover(index)}>
          <motion.span className={styles.bar} data-current={index === 11 || undefined} initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: Math.max(value / max, .02) }}
            transition={reduced ? { duration: 0 } : { ...spring.smooth, delay: .12 + index * .02 }} />
          <span className={styles.barLabel}>{monthLabels[index]![0]}</span>
        </span>)}
      </div>
    </section>

    <dl className={styles.facts}>
      <div><dt>Owner</dt><dd className={styles.ownerFact}><Avatar name={vendor.owner} size="sm" />{vendor.owner}</dd></div>
      <div><dt>Payment</dt><dd>{vendor.terms}</dd></div>
      <div><dt>Contract</dt><dd>{vendor.contract}</dd></div>
    </dl>

    <section aria-label="Recent transactions">
      <div className={styles.barsHead}>
        <h3 className={styles.sectionTitle}>Recent transactions</h3>
        <a className={styles.link} href={hrefFor("transactions")}>All transactions<ArrowUpRight size={14} strokeWidth={1.9} aria-hidden="true" /></a>
      </div>
      {recent.length
        ? <ul className={styles.recent}>{recent.map(tx => <li key={tx.id}>
          <span><b>{tx.memo ?? tx.category}</b><span>{days.find(day => day.day === tx.day)?.date} · {tx.person}</span></span>
          <span className={styles.recentAmount}>{money(tx.amount, 2)}</span>
        </li>)}</ul>
        : <p className={styles.quiet}>No charges in the last 7 days.</p>}
    </section>
  </div>;
}
