import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import type { Route } from "./routes";
import styles from "./Placeholder.module.css";

const { duration, ease, blur, stagger } = motionTokens;

/** Stands in for a page that has not been designed yet, in the same layout the real page will use. */
export function Placeholder({ route }: { route: Route }) {
  const reduced = useReducedMotion() ?? false;
  const Icon = route.icon;
  const rise = (index: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)", filter: `blur(${blur.soft}px)` },
    animate: { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" },
    transition: { duration: duration.considered, ease: [...ease.enter] as [number, number, number, number], delay: .04 + index * stagger.line },
  });
  return <section className={styles.root} aria-labelledby="placeholder-title">
    <motion.div className={styles.mark} {...rise(0)} aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></motion.div>
    <motion.h1 id="placeholder-title" className={styles.title} {...rise(1)}>{route.label}</motion.h1>
    <motion.p className={styles.blurb} {...rise(2)}>{route.blurb}</motion.p>
    <motion.div className={styles.ghosts} {...rise(3)} aria-hidden="true">
      {[0, 1, 2, 3].map(row => <span key={row} className={styles.ghost} style={{ animationDelay: `${row * 120}ms` }} />)}
    </motion.div>
    <motion.p className={styles.soon} {...rise(4)}>This page is on its way. <a href="#/" className={styles.back}><ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />Back to overview</a></motion.p>
  </section>;
}
