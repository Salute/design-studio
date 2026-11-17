import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { SearchField } from "@/components/arc/search-field/search-field";
import { pageVariants, regionVariants, stillVariants } from "./motion";
import styles from "./Page.module.css";

const { duration, ease, blur } = motionTokens;

/** The page frame: one staggered entrance for everything inside. Wrap each region in `Region`. */
export function Page({ children }: { children: ReactNode }) {
  return <motion.div className={styles.root} variants={pageVariants} initial="hidden" animate="shown">{children}</motion.div>;
}

export function Region({ children, className, still, as = "div", ...props }: { children: ReactNode; className?: string; still?: boolean; as?: "div" | "section"; "aria-label"?: string; "aria-labelledby"?: string }) {
  const reduced = useReducedMotion() ?? false;
  const Tag = as === "section" ? motion.section : motion.div;
  return <Tag className={className} variants={reduced || still ? stillVariants : regionVariants} {...props}>{children}</Tag>;
}

/**
 * The page row: what you are looking at on the left, how to look at it on the right. Company-wide controls stay in the header.
 * `meta` is the quiet context beside the title (a period, a count); it swaps in place when it changes.
 */
export function PageToolbar({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return <Region className={styles.toolbar}>
    <h1 className={styles.title}>
      {title}
      {meta && <span className={styles.meta}><AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={meta} initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)", filter: `blur(${blur.subtle}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)", filter: `blur(${blur.subtle}px)`, transition: { duration: duration.exit, ease: [...ease.standard] } }}
          transition={{ duration: duration.standard, ease: [...ease.enter] }}>{meta}</motion.span>
      </AnimatePresence></span>}
    </h1>
    {children && <div className={styles.controls}>{children}</div>}
  </Region>;
}

/** Arc's menu trigger is the small control size; this sizes it to match the pill dropdowns beside it. */
export function PillMenu({ children }: { children: ReactNode }) {
  return <span className={styles.pillMenu}>{children}</span>;
}

/** A search field in the toolbar's pill shape. The label is kept for screen readers only. */
export function PillSearch({ label, value, onValueChange, placeholder }: { label: string; value: string; onValueChange: (value: string) => void; placeholder: string }) {
  return <span className={styles.search}><SearchField label={label} value={value} onValueChange={onValueChange} placeholder={placeholder} /></span>;
}

export function Stats({ children, label }: { children: ReactNode; label: string }) {
  return <Region as="section" className={styles.stats} aria-label={label}>{children}</Region>;
}

export interface StatProps {
  label: string;
  badge?: ReactNode;
  children: ReactNode;
  /** A chart line this stat switches; draws a sample of the line beside the label. */
  swatch?: string;
  /** For a switch or a filter: whether it is on. Sets aria-pressed. */
  pressed?: boolean;
  /** "filter" tints the stat while it is on, so the row reads as the list's filters. */
  kind?: "toggle" | "filter" | "jump";
  onClick?: () => void;
  ariaLabel?: string;
  /** Steps the stat back while it is not in play. */
  dim?: boolean;
  /** A value that covers the counter for a moment, such as a scrub reading. The counter stays mounted underneath, so it never replays its entrance. */
  reading?: string | null;
}

/** Quiet label over a tabular number, with a badge underneath. Clickable stats press like buttons; static ones sit still. */
export function Stat({ label, badge, children, swatch, pressed, kind = "toggle", onClick, ariaLabel, dim, reading = null }: StatProps) {
  const body = <>
    <span className={styles.statLabel}>
      {label}
      {swatch && <span className={styles.swatch} data-series={swatch} data-on={pressed || undefined} aria-hidden="true" />}
      {kind === "jump" && <ArrowDown className={styles.jump} size={14} strokeWidth={1.9} aria-hidden="true" />}
    </span>
    <span className={styles.statValue} data-reading={reading !== null || undefined}>
      <span className={styles.rest}>{children}</span>
      {reading !== null && <span className={styles.plain}>{reading}</span>}
    </span>
    <span className={styles.statChange} data-hidden={dim || undefined}>{badge}</span>
  </>;
  if (!onClick) return <div className={styles.stat} data-dim={dim || undefined}>{body}</div>;
  return <button type="button" className={styles.stat} data-interactive data-kind={kind} data-dim={dim || undefined}
    aria-pressed={pressed} onClick={onClick} aria-label={ariaLabel}>{body}</button>;
}

/** The quiet date or label shown at the right of the stats row while something is being read off a chart. */
export function StatsReading({ children }: { children: ReactNode }) {
  return <motion.p className={styles.reading}
    initial={{ opacity: 0, transform: "translateY(4px)", filter: `blur(${blur.subtle}px)` }} animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
    exit={{ opacity: 0, transition: { duration: duration.exit } }} transition={{ duration: duration.fast, ease: [...ease.enter] }}>{children}</motion.p>;
}

export function ForecastTag({ shown }: { shown: boolean }) {
  return <span className={styles.forecastTag} data-shown={shown || undefined} aria-hidden={!shown}>Forecast</span>;
}

/** Shown when a search or filter leaves a list with nothing in it. */
export function NoResults({ children, onReset, resetLabel }: { children: ReactNode; onReset: () => void; resetLabel: string }) {
  return <motion.div className={styles.noResults} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.exit } }}
    transition={{ duration: duration.standard, ease: [...ease.enter], delay: .08 }}>
    <p>{children}</p>
    <button type="button" className={styles.reset} onClick={onReset}>{resetLabel}</button>
  </motion.div>;
}
