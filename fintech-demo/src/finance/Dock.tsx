import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { hrefFor, routes, type RouteId } from "./routes";
import styles from "./Dock.module.css";

const { spring, duration, blur, ease } = motionTokens;

/**
 * Cove's primary navigation, carried over from Pulse's floating dock. The current page opens up to show its name while the others
 * stay icons; one shared plate glides to whichever page is current, and the label grows out of a soft blur as the plate arrives.
 */
export function Dock({ route, onAsk, asking, coveOpen, unseen }: { route: RouteId; onAsk: () => void; asking: boolean; coveOpen: boolean; unseen: number }) {
  const reduced = useReducedMotion() ?? false;
  const travel = reduced ? { duration: 0 } : spring.morph;
  return <motion.nav className={styles.dock} aria-label="Cove"
    initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px) scale(.96)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
    transition={reduced ? { duration: duration.standard } : { ...spring.smooth, delay: .6 }}>
    <div className={styles.tray}>
      {routes.map(({ id, label, icon: Icon }) => {
        const current = route === id;
        const link = <a key={id} href={hrefFor(id)} className={styles.item} aria-current={current ? "page" : undefined} aria-label={label} data-current={current || undefined}>
          {current && <motion.span layoutId="dock-plate" className={styles.plate} transition={travel} aria-hidden="true" />}
          <span className={styles.icon}><Icon size={16} strokeWidth={1.75} aria-hidden="true" /></span>
          <AnimatePresence initial={false}>
            {current && <motion.span key="label" className={styles.labelClip}
              initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0, transition: reduced ? { duration: 0 } : { ...spring.morph, opacity: { duration: duration.exit, ease: [...ease.standard] } } }}
              transition={reduced ? { duration: 0 } : { ...spring.morph, opacity: { duration: duration.standard, ease: [...ease.enter] } }}>
              <motion.span className={styles.label} initial={reduced ? false : { filter: `blur(${blur.soft}px)`, transform: "translateX(-4px)" }} animate={{ filter: "blur(0px)", transform: "translateX(0px)" }}
                transition={{ duration: duration.standard, ease: [...ease.enter] }}>{label}</motion.span>
            </motion.span>}
          </AnimatePresence>
        </a>;
        return current ? link : <Tooltip key={id} side="top" content={label}>{link}</Tooltip>;
      })}
      <span className={styles.rule} aria-hidden="true" />
      {/* Ask Cove opens Cove Intelligence. Until it has been opened once, a count shows how many insights are waiting. */}
      <button type="button" className={styles.ask} onClick={onAsk} data-asking={asking || undefined} data-open={coveOpen || undefined}
        aria-haspopup="dialog" aria-expanded={coveOpen} aria-label={unseen ? `Ask Cove, ${unseen} new insights` : "Ask Cove"}>
        <span className={styles.askGlow} aria-hidden="true" />
        <span className={styles.sparkWrap}>
          <Sparkles className={styles.spark} size={16} strokeWidth={1.75} aria-hidden="true" />
          <AnimatePresence>
            {unseen > 0 && <motion.span key="count" className={styles.count} aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.6)" }} animate={{ opacity: 1, transform: "scale(1)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.6)", filter: `blur(${blur.subtle}px)`, transition: { duration: duration.exit, ease: [...ease.standard] } }}
              transition={reduced ? { duration: duration.fast } : { ...spring.snappy, delay: 1.2 }}>{unseen}</motion.span>}
          </AnimatePresence>
        </span>
        <span>Ask Cove</span>
      </button>
    </div>
  </motion.nav>;
}
