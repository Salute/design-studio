import type { CSSProperties } from "react";
import styles from "./Monogram.module.css";

const hues: Record<string, number> = {
  AWS: 55, Gusto: 20, WeWork: 270, "Google Ads": 145, Figma: 320, Delta: 240, Slack: 300, Notion: 0, Linear: 265, GitHub: 220,
  Datadog: 290, Uber: 200, OpenAI: 170, Sweetgreen: 140, Vercel: 250, "Blue Bottle": 230, Loom: 280, Vimeo: 205, Salesforce: 215,
};

/** A vendor's initial on a tinted squircle. Monograms stand in for logos so no third-party mark is reproduced. */
export function Monogram({ name, size = 28, hue }: { name: string; size?: number; hue?: number }) {
  const tint = hue ?? hues[name] ?? [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return <span className={styles.mark} style={{ "--hue": tint, "--size": `${size}px` } as CSSProperties} aria-hidden="true">{name[0]}</span>;
}
