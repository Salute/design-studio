import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { Drawer, DrawerContent, useDrawerItem } from "@/components/arc/drawer/drawer";
import { Slider } from "@/components/arc/slider/slider";
import { useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { compact, quarterProgress } from "../data";
import { budgetRecords, quarterDaysLeft, quarterWeek, type BudgetRecord } from "../ledger";
import { Monogram } from "../Monogram";
import { Page, PageToolbar, Region, Stat, Stats } from "../Page";
import styles from "./BudgetsPage.module.css";

const { ease, spring, blur, stagger } = motionTokens;

/** Spend so far plus the forecast for the weeks still to come. */
const projectedOf = (budget: BudgetRecord) => budget.spent + budget.weekly.slice(quarterWeek + 1).reduce((sum, week) => sum + week, 0) * 1000;
type Tone = "over" | "near" | "ok";
const toneOf = (budget: BudgetRecord, amount = budget.budget): Tone => {
  const ahead = budget.spent / amount / quarterProgress;
  return ahead > 1.15 ? "over" : ahead > 1.04 ? "near" : "ok";
};
const toneLabel: Record<Tone, string> = { over: "Ahead of pace", near: "Watch", ok: "On track" };

export function BudgetsPage() {
  const { toast } = useToastStack();
  const [budgets, setBudgets] = useState<BudgetRecord[]>(budgetRecords);
  const [openId, setOpenId] = useState<string | null>(null);
  const total = budgets.reduce((sum, item) => sum + item.budget, 0);
  const spent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const projected = budgets.reduce((sum, item) => sum + projectedOf(item), 0);
  const gap = projected - total;
  const open = budgets.find(item => item.id === openId) ?? null;
  const shownBudget = useDrawerItem(open);

  const save = (item: BudgetRecord, amount: number) => {
    const before = item.budget;
    setBudgets(current => current.map(entry => entry.id === item.id ? { ...entry, budget: amount } : entry));
    setOpenId(null);
    toast({ type: "success", title: `${item.name} budget set to ${compact(amount)}`, description: `${item.owner.split(" ")[0]} has been told. It was ${compact(before)}.`,
      action: { label: "Undo", onClick: () => setBudgets(current => current.map(entry => entry.id === item.id ? { ...entry, budget: before } : entry)) } });
  };

  return <Page>
    <PageToolbar title="Budgets" meta={`Q4 2026 · ${quarterDaysLeft} days left`} />

    <Stats label="Budget numbers">
      <Stat label="Q4 budget" badge={<Badge tone="neutral" size="sm">{`${budgets.length} categories`}</Badge>}><AnimatedCounter value={total} prefix="$" animateOnView /></Stat>
      <Stat label="Spent" badge={<Badge tone="neutral" size="sm">{`${Math.round((spent / total) * 100)}% used, ${Math.round(quarterProgress * 100)}% through`}</Badge>}><AnimatedCounter value={spent} prefix="$" animateOnView /></Stat>
      <Stat label="Remaining" badge={<Badge tone="neutral" size="sm">{`${compact((total - spent) / quarterDaysLeft)} a day to stay on budget`}</Badge>}><AnimatedCounter value={total - spent} prefix="$" animateOnView /></Stat>
      <Stat label="Projected end" badge={<Badge tone={gap > 0 ? "danger" : "success"} size="sm">{`${compact(Math.abs(gap))} ${gap > 0 ? "over" : "under"}`}</Badge>}><AnimatedCounter value={Math.round(projected)} prefix="$" animateOnView /></Stat>
    </Stats>

    <Region as="section" className={styles.grid} aria-label="Budgets by category">
      {budgets.map((item, index) => <BudgetCard key={item.id} item={item} index={index} onOpen={() => setOpenId(item.id)} />)}
    </Region>

    <Drawer open={open !== null} onOpenChange={next => { if (!next) setOpenId(null); }}>
      {shownBudget && <DrawerContent title={shownBudget.name} description={`Owned by ${shownBudget.owner} · Q4 2026`}>
        <Adjust key={shownBudget.id} item={shownBudget} onSave={amount => save(shownBudget, amount)} onCancel={() => setOpenId(null)} />
      </DrawerContent>}
    </Drawer>
  </Page>;
}

function BudgetCard({ item, index, onOpen }: { item: BudgetRecord; index: number; onOpen: () => void }) {
  const tone = toneOf(item);
  const projected = projectedOf(item);
  const end = projected - item.budget;
  return <button type="button" className={styles.card} data-tone={tone} onClick={onOpen} aria-label={`${item.name}: ${compact(item.spent)} of ${compact(item.budget)}, ${toneLabel[tone].toLowerCase()}. Adjust budget`}>
    <span className={styles.cardHead}>
      <span className={styles.cardName}>{item.name}</span>
      <span className={styles.flag}>{toneLabel[tone]}</span>
    </span>
    <span className={styles.figures}>
      <span className={styles.spent}><AnimatedCounter value={item.spent} prefix="$" animateOnView /></span>
      <span className={styles.of}>of <span className={styles.ofNum}><AnimatedCounter value={item.budget} prefix="$" /></span></span>
    </span>
    <Meter spent={item.spent} budget={item.budget} delay={index * stagger.item * 2} />
    <Weeks weekly={item.weekly} />
    <span className={styles.cardFoot}>
      <span className={styles.owner}><Avatar name={item.owner} size="sm" />{item.owner}</span>
      <span className={styles.projection} data-tone={end > 0 ? "over" : "under"}>Ends {compact(Math.abs(end))} {end > 0 ? "over" : "under"}</span>
    </span>
  </button>;
}

/** Spend against the budget, with a tick where spend should be today. The fill springs to a new budget, so a change reads as cause and effect. */
function Meter({ spent, budget, delay = 0, live = false }: { spent: number; budget: number; delay?: number; live?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const ratio = Math.min(1, spent / budget);
  return <span className={styles.meter} aria-hidden="true">
    <motion.span className={styles.fill} initial={reduced || live ? false : { scaleX: 0 }} animate={{ scaleX: ratio }}
      transition={reduced ? { duration: 0 } : live ? spring.snappy : { ...spring.smooth, visualDuration: .7, delay: .15 + delay }} />
    <span className={styles.paceTick} style={{ left: `${quarterProgress * 100}%` }} />
  </span>;
}

/** Thirteen weeks: the ones behind us are spend, this week is highlighted, the ones ahead are the forecast, drawn faint. */
function Weeks({ weekly }: { weekly: number[] }) {
  // Weekly spend moves within a narrow band, so bars scale between the category's own low and high week: the shape shows, not just the size.
  const max = Math.max(...weekly), min = Math.min(...weekly);
  const height = (week: number) => 30 + (max === min ? 70 : ((week - min) / (max - min)) * 70);
  return <span className={styles.weeks} aria-hidden="true">
    {weekly.map((week, index) => <span key={index} className={styles.week} data-when={index < quarterWeek ? "past" : index === quarterWeek ? "now" : "future"} style={{ height: `${height(week)}%` }} />)}
  </span>;
}

function Adjust({ item, onSave, onCancel }: { item: BudgetRecord; onSave: (amount: number) => void; onCancel: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const [amount, setAmount] = useState(item.budget);
  const min = Math.ceil(item.spent / 10000) * 10000;
  const max = Math.round((item.budget * 2) / 10000) * 10000;
  const projected = projectedOf(item);
  const end = projected - amount;
  const tone = toneOf(item, amount);
  const verdict = Math.abs(end) < 1000 ? "lands right on budget" : `ends ${compact(Math.abs(end))} ${end > 0 ? "over" : "under"}`;
  const changed = amount !== item.budget;

  return <div className={styles.adjust}>
    <div className={styles.adjustHero}>
      <p className={styles.adjustAmount}>{compact(item.spent)} <span>of {compact(amount)}</span></p>
      <Meter spent={item.spent} budget={amount} live />
      <p className={styles.verdict} data-tone={end > 1000 ? "over" : "under"}>
        At this pace, {item.name.split(" ")[0]}{" "}
        <span className={styles.verdictSwap}><AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={verdict} initial={reduced ? { opacity: 0 } : { opacity: 0, filter: `blur(${blur.subtle}px)` }} animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: .08 } }} transition={{ duration: .15, ease: [...ease.enter] }}>{verdict}</motion.b>
        </AnimatePresence></span>.
      </p>
    </div>

    {/* Dragging is direct manipulation: the meter and the verdict follow the thumb with no delay to speak of. */}
    <Slider label="Q4 budget" value={amount} onValueChange={setAmount} min={min} max={max} step={1000} format={compact} showValue={false} />

    <div className={styles.status} data-tone={tone}><span className={styles.flag}>{toneLabel[tone]}</span>
      <span>Spend is {Math.round((item.spent / amount) * 100)}% of the budget, {Math.round(quarterProgress * 100)}% of the way through the quarter.</span></div>

    <section aria-label="Where it goes">
      <h3 className={styles.sectionTitle}>Where it goes</h3>
      <ul className={styles.top}>
        {item.top.map((entry, index) => <li key={entry.vendor}>
          <motion.span className={styles.topFill} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: entry.amount / item.top[0]!.amount }}
            transition={reduced ? { duration: 0 } : { ...spring.smooth, delay: .15 + index * stagger.item * 2 }} aria-hidden="true" />
          <span className={styles.topLabel}><Monogram name={entry.vendor} size={20} />{entry.vendor}</span>
          <span className={styles.topValue}>{compact(entry.amount)}</span>
        </li>)}
      </ul>
    </section>

    <div className={styles.buttons}>
      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button className={styles.save} disabled={!changed} onClick={() => onSave(amount)}>{changed ? `Set to ${compact(amount)}` : "No changes"}</Button>
    </div>
  </div>;
}

