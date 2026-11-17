import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { compact, money, renewals } from "./data";
import { Monogram } from "./Monogram";
import panel from "./Panel.module.css";
import styles from "./Renewals.module.css";

const { spring, stagger } = motionTokens;
const WINDOW = 30;

/** A 30-day strip on top, the list below. Pointing at either one lights up its partner, so a date and a charge always read together. */
export function Renewals() {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLElement>(null);
  const seen = useInView(root, { once: true, amount: .4 });
  const [hot, setHot] = useState<string | null>(null);
  const total = renewals.reduce((sum, item) => sum + item.amount, 0);
  const biggest = Math.max(...renewals.map(item => item.amount));

  const bind = (id: string) => ({
    onPointerEnter: () => setHot(id), onPointerLeave: () => setHot(current => current === id ? null : current),
    onFocus: () => setHot(id), onBlur: () => setHot(current => current === id ? null : current),
  });

  return <section ref={root} className={panel.panel} aria-labelledby="renewals-title" data-hot={hot ? "" : undefined}>
    <header className={panel.head}>
      <h2 id="renewals-title" className={panel.title}>Renewals <span className={panel.quiet}>next 30 days</span></h2>
      <span className={panel.meta}>{compact(total)}</span>
    </header>

    <div className={styles.strip} aria-hidden="true">
      <motion.span className={styles.rail} initial={{ scaleX: 0 }} animate={{ scaleX: seen ? 1 : 0 }} transition={reduced ? { duration: 0 } : { ...spring.smooth, visualDuration: .8 }} />
      <span className={styles.today}>Today</span>
      {renewals.map((item, index) => {
        const size = 8 + (item.amount / biggest) * 10;
        return <motion.span key={item.id} className={styles.pin} data-hot={hot === item.id || undefined} data-flag={item.flag ? "" : undefined}
          style={{ left: `${(item.in / WINDOW) * 100}%`, width: size, height: size }}
          initial={{ opacity: 0, scale: .6 }} animate={seen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: .6 }}
          transition={reduced ? { duration: 0 } : { ...spring.snappy, delay: .25 + index * stagger.item * 2 }} {...bind(item.id)}>
          <span className={styles.pinLabel}>{item.date}</span>
        </motion.span>;
      })}
      <span className={styles.end}>Dec 4</span>
    </div>

    <ul className={styles.list}>
      {renewals.map(item => <li key={item.id} className={styles.row} tabIndex={0} data-hot={hot === item.id || undefined} {...bind(item.id)}
        aria-label={`${item.name}, ${item.plan}, ${money(item.amount)} on ${item.date}${item.flag ? `, ${item.flag}` : ""}`}>
        <Monogram name={item.name} size={28} hue={item.hue} />
        <div className={styles.what}>
          <p className={styles.name}>{item.name}{item.flag && <span className={styles.flag}>{item.flag}</span>}</p>
          <p className={styles.plan}>{item.plan}</p>
        </div>
        <div className={styles.when}>
          <p className={styles.amount}>{money(item.amount)}</p>
          <p className={styles.date} data-soon={item.in <= 3 || undefined}>{item.in <= 3 ? `In ${item.in} days` : item.date}</p>
        </div>
      </li>)}
    </ul>
  </section>;
}
