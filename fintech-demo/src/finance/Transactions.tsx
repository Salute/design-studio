import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check, ChevronRight, Paperclip } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { Button } from "@/components/arc/button/button";
import { incoming, money, transactions as seed, type Transaction, type TxStatus } from "./data";
import { Monogram } from "./Monogram";
import { hrefFor } from "./routes";
import panel from "./Panel.module.css";
import styles from "./Transactions.module.css";

const { duration, spring, blur } = motionTokens;
const statusLabel: Record<TxStatus, string> = { cleared: "Cleared", pending: "Pending", receipt: "Needs receipt", draft: "Draft" };

/** The live ledger. New card swipes slide in at the top once the panel has been seen; a missing receipt can be matched in place. */
export function Transactions({ draftSignal }: { draftSignal: number }) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLElement>(null);
  const seen = useInView(root, { once: true, amount: .3 });
  const [rows, setRows] = useState<Transaction[]>(seed);
  const [matching, setMatching] = useState<Record<string, boolean>>({});
  const next = useRef(0);

  // Simulated card feed: a swipe arrives every few seconds after the panel is first seen, four in all.
  useEffect(() => {
    if (!seen) return;
    const gaps = [3200, 6500, 5200, 7400];
    let timer = 0;
    const arrive = () => {
      const at = next.current++;
      const swipe = incoming[at % incoming.length]!;
      setRows(current => [{ ...swipe, id: `live-${at}`, when: "Just now" }, ...current].slice(0, 7));
      if (next.current < incoming.length) timer = window.setTimeout(arrive, gaps[next.current]);
    };
    timer = window.setTimeout(arrive, gaps[0]);
    return () => window.clearTimeout(timer);
  }, [seen]);

  // New expense in the header drops a draft at the top of the ledger.
  const lastDraft = useRef(draftSignal);
  useEffect(() => {
    if (draftSignal === lastDraft.current) return;
    lastDraft.current = draftSignal;
    setRows(current => [{ id: `draft-${draftSignal}`, vendor: "New expense", category: "Uncategorised", person: "You", card: "—", amount: 0, when: "Just now", status: "draft" as const, hue: 250 }, ...current].slice(0, 7));
    root.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [draftSignal, reduced]);

  const match = (id: string) => {
    setMatching(current => ({ ...current, [id]: true }));
    window.setTimeout(() => {
      setRows(current => current.map(row => row.id === id ? { ...row, status: "cleared" as const } : row));
      setMatching(current => ({ ...current, [id]: false }));
    }, reduced ? 200 : 900);
  };

  const missing = rows.filter(row => row.status === "receipt").length;

  return <section ref={root} className={`${panel.panel} ${panel.wide}`} aria-labelledby="tx-title">
    <header className={panel.head}>
      <h2 id="tx-title" className={panel.title}>
        <span className={styles.live} aria-hidden="true" />Transactions
        <span className={panel.quiet}>{missing ? `${missing} missing ${missing === 1 ? "receipt" : "receipts"}` : "all receipts matched"}</span>
      </h2>
      <a href={hrefFor("transactions")} className={styles.more}>View all<ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" /></a>
    </header>
    <ul className={styles.list} aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map(row => <motion.li key={row.id} layout={!reduced} className={styles.row} data-fresh={row.when === "Just now" || undefined} data-status={row.status}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(-12px) scale(.98)", filter: `blur(${blur.soft}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: duration.exit } }}
          transition={reduced ? { duration: duration.fast } : spring.smooth}>
          <Monogram name={row.vendor} size={32} hue={row.hue} />
          <div className={styles.what}>
            <p className={styles.vendor}>{row.vendor}</p>
            <p className={styles.sub}>{row.category} · {row.person}{row.card !== "—" && <span className={styles.card}> · {row.card === "ACH" ? "ACH" : `•• ${row.card}`}</span>}</p>
          </div>
          <div className={styles.status}>
            {row.status === "receipt"
              ? <Button variant="secondary" size="sm" className={styles.attach} loading={!!matching[row.id]} onClick={() => match(row.id)}><Paperclip size={13} strokeWidth={1.9} aria-hidden="true" />Match receipt</Button>
              : <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={row.status} className={styles.chip} data-status={row.status}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.92)", filter: `blur(${blur.subtle}px)` }}
                  animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }} transition={reduced ? { duration: duration.fast } : spring.snappy}>
                  {row.status === "cleared" && <Check size={12} strokeWidth={2.4} aria-hidden="true" />}{statusLabel[row.status]}
                </motion.span>
              </AnimatePresence>}
          </div>
          <p className={styles.amount}>{row.status === "draft" ? <span className={styles.draftAmount}>Add amount</span> : money(row.amount, 2)}</p>
          <p className={styles.when}>{row.when}</p>
        </motion.li>)}
      </AnimatePresence>
    </ul>
  </section>;
}

