import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Badge } from "@/components/arc/badge/badge";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { Switch } from "@/components/arc/switch/switch";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { money } from "../data";
import { subscriptions as seed, type Subscription } from "../ledger";
import { Monogram } from "../Monogram";
import { Page, PageToolbar, Region, Stat, Stats } from "../Page";
import panel from "../Panel.module.css";
import styles from "./SubscriptionsPage.module.css";

const { duration, ease, spring, blur } = motionTokens;
type View = "monthly" | "annual";
const views = [{ value: "monthly", label: "Monthly cost" }, { value: "annual", label: "Annual cost" }];
const WINDOW = 90;
const monthly = (sub: Subscription) => sub.seats * sub.price;

export function SubscriptionsPage() {
  const { toast } = useToastStack();
  const [subs, setSubs] = useState<Subscription[]>(seed);
  const [view, setView] = useState<View>("monthly");
  const [saved, setSaved] = useState(0);
  const [hot, setHot] = useState<string | null>(null);

  const total = subs.reduce((sum, sub) => sum + monthly(sub), 0);
  const idle = subs.reduce((sum, sub) => sum + (sub.autoRenew ? sub.seats - sub.used : 0), 0);
  const soon = subs.filter(sub => sub.in <= 30 && sub.autoRenew);
  const update = (id: string, patch: Partial<Subscription>) => setSubs(current => current.map(sub => sub.id === id ? { ...sub, ...patch } : sub));

  const reclaim = (sub: Subscription) => {
    const seats = sub.seats - sub.used;
    const yearly = Math.round(seats * sub.price * 12);
    update(sub.id, { seats: sub.used });
    setSaved(current => current + yearly);
    toast({ type: "success", title: `Reclaimed ${seats} ${sub.name} seats`, description: `Saves ${money(yearly)} a year from the ${sub.date} renewal.`,
      action: { label: "Undo", onClick: () => { update(sub.id, { seats: sub.seats }); setSaved(current => current - yearly); } } });
  };

  const setRenew = (sub: Subscription, autoRenew: boolean) => {
    update(sub.id, { autoRenew });
    toast({ type: autoRenew ? "success" : "info", title: autoRenew ? `${sub.name} will renew` : `${sub.name} ends ${sub.date}`,
      description: autoRenew ? `Renews on ${sub.date} for ${money(monthly(sub) * (sub.cycle === "Annual" ? 12 : 1))}.` : "It stays active until then. Turn auto-renew back on any time before.",
      action: { label: "Undo", onClick: () => update(sub.id, { autoRenew: !autoRenew }) } });
  };

  const bind = (id: string) => ({ onPointerEnter: () => setHot(id), onPointerLeave: () => setHot(current => current === id ? null : current), onFocus: () => setHot(id), onBlur: () => setHot(current => current === id ? null : current) });

  return <Page>
    <PageToolbar title="Subscriptions" meta={`${subs.length} tools`}>
      <MorphSelect label="Cost" hideLabel value={view} searchable={false} items={views} onValueChange={value => setView(value as View)} />
    </PageToolbar>

    <Stats label="Subscription numbers">
      <Stat label="Monthly cost" badge={<Badge tone="neutral" size="sm">{`${subs.filter(sub => sub.cycle === "Annual").length} billed annually`}</Badge>}><AnimatedCounter value={Math.round(total)} prefix="$" animateOnView /></Stat>
      <Stat label="Annual run rate" badge={<Badge tone="neutral" size="sm">Before reclaims</Badge>}><AnimatedCounter value={Math.round(total * 12)} prefix="$" animateOnView /></Stat>
      <Stat label="Idle seats" badge={<Badge tone={idle ? "warning" : "success"} size="sm">{idle ? "Unused 60+ days" : "All in use"}</Badge>}><AnimatedCounter value={idle} animateOnView /></Stat>
      <Stat label="Saved so far" badge={<Badge tone={saved ? "success" : "neutral"} size="sm">{saved ? "A year, from reclaims" : "Reclaim idle seats below"}</Badge>}><AnimatedCounter value={saved} prefix="$" /></Stat>
    </Stats>

    <Region as="section" className={panel.panel} aria-labelledby="subs-renewals">
      <header className={panel.head}>
        <h2 id="subs-renewals" className={panel.title}>Renewals <span className={panel.quiet}>next 90 days</span></h2>
        <span className={panel.meta}>{soon.length} in the next 30 days</span>
      </header>
      <div className={styles.strip} aria-hidden="true">
        <span className={styles.rail} />
        {[30, 60].map(mark => <span key={mark} className={styles.mark} style={{ left: `${(mark / WINDOW) * 100}%` }}>{mark} days</span>)}
        <span className={styles.today}>Today</span>
        {subs.map(sub => <span key={sub.id} className={styles.pin} data-hot={hot === sub.id || undefined} data-off={!sub.autoRenew || undefined} style={{ left: `${(sub.in / WINDOW) * 100}%` }} {...bind(sub.id)}>
          <Monogram name={sub.name} size={22} />
          <span className={styles.pinLabel}>{sub.name} · {sub.date}</span>
        </span>)}
      </div>
    </Region>

    <Region as="section" className={panel.panel} aria-labelledby="subs-list">
      <header className={panel.head}>
        <h2 id="subs-list" className={panel.title}>All subscriptions</h2>
        <span className={panel.meta}>Soonest renewal first</span>
      </header>
      <ul className={styles.list} data-hot={hot ? "" : undefined}>
        {subs.map(sub => <Row key={sub.id} sub={sub} view={view} hot={hot === sub.id} bind={bind(sub.id)} onReclaim={() => reclaim(sub)} onRenew={on => setRenew(sub, on)} />)}
      </ul>
    </Region>
  </Page>;
}

function Row({ sub, view, hot, bind, onReclaim, onRenew }: { sub: Subscription; view: View; hot: boolean; bind: object; onReclaim: () => void; onRenew: (on: boolean) => void }) {
  const reduced = useReducedMotion() ?? false;
  const idle = sub.seats - sub.used;
  const cost = Math.round(monthly(sub) * (view === "annual" ? 12 : 1));
  const renewal = sub.autoRenew ? (sub.in <= 7 ? `Renews in ${sub.in} days` : `Renews ${sub.date}`) : `Ends ${sub.date}`;
  return <li className={styles.row} data-hot={hot || undefined} data-off={!sub.autoRenew || undefined} {...bind}>
    <Monogram name={sub.name} size={34} />
    <div className={styles.what}>
      <p className={styles.name}>{sub.name}</p>
      <p className={styles.plan}>{sub.plan} · {sub.cycle.toLowerCase()} · {sub.owner}</p>
    </div>

    {/* Seats: the fill is what is used; the hatched rest is idle. Reclaiming shrinks the plan to what is used, so the fill grows to the end. */}
    <div className={styles.seats}>
      <div className={styles.meter} aria-hidden="true">
        <span className={styles.idle} />
        <motion.span className={styles.used} data-warn={idle / sub.seats > .25 || undefined} initial={false} animate={{ scaleX: sub.used / sub.seats }} transition={reduced ? { duration: 0 } : { ...spring.smooth, visualDuration: .5 }} />
      </div>
      <p className={styles.seatText}><span className={styles.num}><AnimatedCounter value={sub.used} /></span> of <span className={styles.num}><AnimatedCounter value={sub.seats} /></span> seats</p>
    </div>

    <p className={styles.cost}><span className={styles.num}><AnimatedCounter value={cost} prefix="$" /></span><span>{view === "annual" ? "/yr" : "/mo"}</span></p>

    <p className={styles.renewal} data-soon={sub.autoRenew && sub.in <= 7 || undefined}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={renewal} initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)", filter: `blur(${blur.subtle}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)", filter: `blur(${blur.subtle}px)`, transition: { duration: duration.exit, ease: [...ease.standard] } }}
          transition={{ duration: .2, ease: [...ease.enter] }}>{renewal}</motion.span>
      </AnimatePresence>
    </p>

    <div className={styles.actions}>
      <span className={styles.reclaimSlot}>
        <AnimatePresence initial={false}>
          {idle >= 3 && idle / sub.seats >= .1 && sub.autoRenew && <motion.button key="reclaim" type="button" className={styles.reclaim} onClick={onReclaim}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transform: reduced ? "none" : "scale(.96)", filter: reduced ? "none" : `blur(${blur.subtle}px)`, transition: { duration: .15, ease: [...ease.enter] } }}
            transition={{ duration: .2, ease: [...ease.enter] }}>
            Reclaim {idle}
          </motion.button>}
        </AnimatePresence>
      </span>
      <Tooltip content={sub.autoRenew ? "Auto-renew on" : "Auto-renew off"} side="top">
        <span className={styles.switch}><Switch checked={sub.autoRenew} onCheckedChange={onRenew} aria-label={`Auto-renew ${sub.name}`} /></span>
      </Tooltip>
    </div>
  </li>;
}
