import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { Check, X } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { approvals as seed, money, type Approval } from "./data";
import panel from "./Panel.module.css";
import styles from "./Approvals.module.css";

const { duration, ease, blur } = motionTokens;
type Decision = "approved" | "declined";

/** A decision shows on the row for a beat, so you see what you did, and then the row folds away. */
const HOLD = 720;

/* Removing a row: the content fades out first, then the space closes, so no clipped text slides past. Undo plays it backwards:
   the space opens, then the row fades in. Opacity uses the strong ease-out; the height moves on screen, so it eases in and out. */
const removeRow: Transition = { opacity: { duration: .2, ease: [...ease.standard] }, height: { duration: .28, ease: [...ease.inOut], delay: .1 } };
const restoreRow: Transition = { height: { duration: .28, ease: [...ease.inOut] }, opacity: { duration: .2, ease: [...ease.enter], delay: .12 } };
/* With reduced motion nothing slides: the row fades, then its space goes at once. */
const fadeThenRemove: Transition = { opacity: { duration: duration.fast }, height: { duration: 0, delay: duration.fast } };
const fadeOnly: Transition = { opacity: { duration: duration.fast }, height: { duration: 0 } };

export function Approvals({ queue, onQueueChange }: { queue: Approval[]; onQueueChange: (next: Approval[]) => void }) {
  const reduced = useReducedMotion() ?? false;
  const { toast } = useToastStack();
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  const timers = useRef(new Map<string, number>());
  const latest = useRef(queue);
  latest.current = queue;
  useEffect(() => () => timers.current.forEach(timer => window.clearTimeout(timer)), []);

  const restore = (item: Approval) => {
    const order = seed.map(entry => entry.id);
    onQueueChange([...latest.current.filter(entry => entry.id !== item.id), item].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)));
    setDecided(current => { const next = { ...current }; delete next[item.id]; return next; });
  };

  const decide = (item: Approval, decision: Decision) => {
    if (decided[item.id]) return;
    setDecided(current => ({ ...current, [item.id]: decision }));
    timers.current.set(item.id, window.setTimeout(() => {
      timers.current.delete(item.id);
      onQueueChange(latest.current.filter(entry => entry.id !== item.id));
      toast({
        type: decision === "approved" ? "success" : "info",
        title: `${decision === "approved" ? "Approved" : "Declined"} ${money(item.amount)}`,
        description: `${item.item} for ${item.name}. ${decision === "approved" ? "The card limit is raised." : "They have been notified."}`,
        action: { label: "Undo", onClick: () => restore(item) },
      });
    }, reduced ? 200 : HOLD));
  };

  const total = queue.reduce((sum, item) => sum + item.amount, 0);

  return <section id="approvals" className={panel.panel} aria-labelledby="approvals-title">
    <header className={panel.head}>
      <h2 id="approvals-title" className={panel.title}>
        Approvals <span className={styles.count} data-empty={queue.length === 0 || undefined}><AnimatedCounter value={queue.length} /></span>
      </h2>
      <span className={panel.meta}><AnimatedCounter value={total} prefix="$" /> waiting</span>
    </header>
    <ul className={styles.list}>
      <AnimatePresence initial={false}>
        {queue.map(item => {
          const decision = decided[item.id];
          return <motion.li key={item.id} className={styles.rowClip}
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1, transition: reduced ? fadeOnly : restoreRow }}
            exit={{ height: 0, opacity: 0, transition: reduced ? fadeThenRemove : removeRow }}>
            <div className={styles.row} data-decision={decision}>
              <Avatar name={item.name} size="md" />
              <div className={styles.what}>
                <p className={styles.item}>{item.item}</p>
                <p className={styles.who}>{item.name} · {item.team} · {item.when}</p>
              </div>
              <div className={styles.side}>
                <p className={styles.amount}>{money(item.amount)}</p>
                {/* The buttons and the result share one cell and crossfade in place, so a decision never moves anything. */}
                <div className={styles.actions} data-decision={decision}>
                  <span className={styles.buttons} inert={!!decision}>
                    <Tooltip content="Decline" side="top">
                      <button type="button" className={styles.decline} aria-label={`Decline ${item.item}`} onClick={() => decide(item, "declined")}><X size={15} strokeWidth={2} aria-hidden="true" /></button>
                    </Tooltip>
                    <button type="button" className={styles.approve} onClick={() => decide(item, "approved")}><Check size={15} strokeWidth={2.2} aria-hidden="true" />Approve</button>
                  </span>
                  <span className={styles.result} role="status">
                    {decision === "approved" && <><DrawnCheck delay={.06} />Approved</>}
                    {decision === "declined" && <><X size={14} strokeWidth={2.2} aria-hidden="true" />Declined</>}
                  </span>
                </div>
              </div>
              <span className={styles.policy}>{item.policy}</span>
            </div>
          </motion.li>;
        })}
      </AnimatePresence>
      <AnimatePresence>
        {queue.length === 0 && <motion.li key="empty" className={styles.empty}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)", filter: `blur(${blur.soft}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: duration.exit } }}
          transition={{ duration: duration.considered, ease: [...ease.enter], delay: .2 }}>
          <span className={styles.emptyMark}><DrawnCheck size={22} delay={.35} /></span>
          <span><b>All caught up.</b> New requests land here the moment they are submitted.</span>
        </motion.li>}
      </AnimatePresence>
    </ul>
  </section>;
}

/** A check that draws itself, stroke first, like a pen mark. */
function DrawnCheck({ size = 14, delay = 0 }: { size?: number; delay?: number }) {
  const reduced = useReducedMotion() ?? false;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
      initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .26, ease: [...ease.enter], delay }} />
  </svg>;
}
