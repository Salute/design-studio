import type { Variants } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";

const { duration, ease, blur } = motionTokens;

/** Every page has one orchestrated entrance: each region rises out of a soft blur, a beat after the one above it. */
export const pageVariants: Variants = { hidden: {}, shown: { transition: { staggerChildren: .07, delayChildren: .1 } } };
export const regionVariants: Variants = {
  hidden: { opacity: 0, transform: "translateY(10px)", filter: `blur(${blur.soft}px)` },
  shown: { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)", transition: { duration: duration.considered, ease: [...ease.enter] } },
};
/** Reduced motion, and regions that should not move (the chart), only fade. */
export const stillVariants: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: duration.standard } } };
