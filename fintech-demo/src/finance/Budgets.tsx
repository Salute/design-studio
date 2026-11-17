import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { budgets, compact, quarterProgress } from "./data";
import panel from "./Panel.module.css";
import styles from "./Budgets.module.css";

const { spring, stagger } = motionTokens;

/** Each budget fills to what is spent. A tick marks where spend should be today, so pacing reads at a glance. Hover or focus a row to see what is left. */
export function Budgets() {
  const reduced = useReducedMotion() ?? false;
  const list = useRef<HTMLUListElement>(null);
  const seen = useInView(list, { once: true, amount: .4 });
  const [peek, setPeek] = useState<string | null>(null);
  const spent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const planned = budgets.reduce((sum, item) => sum + item.budget, 0);
  const pace = quarterProgress;

  return <section className={panel.panel} aria-labelledby="budgets-title">
    <header className={panel.head}>
      <h2 id="budgets-title" className={panel.title}>Budgets <span className={panel.quiet}>Q4</span></h2>
      <span className={panel.meta}>{compact(spent)} of {compact(planned)}</span>
    </header>
    <ul ref={list} className={styles.list}>
      {budgets.map((item, index) => {
        const ratio = item.spent / item.budget;
        const ahead = ratio / pace;
        const tone = ratio > 1 ? "over" : ahead > 1.15 ? "over" : ahead > 1.04 ? "near" : "ok";
        const left = item.budget - item.spent;
        const open = peek === item.id;
        return <li key={item.id} className={styles.row} data-tone={tone} tabIndex={0}
          onPointerEnter={event => { if (event.pointerType === "mouse") setPeek(item.id); }} onPointerLeave={() => setPeek(null)}
          onFocus={() => setPeek(item.id)} onBlur={() => setPeek(null)}
          aria-label={`${item.name}: ${compact(item.spent)} of ${compact(item.budget)}, ${left < 0 ? `${compact(-left)} over` : `${compact(left)} left`}${tone === "ok" ? "" : `, ${Math.round((ahead - 1) * 100)}% ahead of pace`}. Owner ${item.owner}.`}>
          <div className={styles.line}>
            <span className={styles.name}>{item.name}{tone !== "ok" && <span className={styles.flag}>{tone === "over" ? `${Math.round((ahead - 1) * 100)}% ahead` : "Watch"}</span>}</span>
            <span className={styles.detail} data-open={open || undefined} aria-hidden="true">
              <span className={styles.total}>{compact(item.spent)} / {compact(item.budget)}</span>
              <span className={styles.left}>{left < 0 ? `${compact(-left)} over` : `${compact(left)} left`}</span>
            </span>
          </div>
          <div className={styles.track} aria-hidden="true">
            <motion.span className={styles.fill} initial={{ scaleX: 0 }} animate={{ scaleX: seen ? Math.min(1, ratio) : 0 }}
              transition={reduced ? { duration: 0 } : { ...spring.smooth, visualDuration: .7, delay: .1 + index * stagger.item * 2 }} />
            <span className={styles.pace} style={{ left: `${pace * 100}%` }} data-shown={seen || undefined} />
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
