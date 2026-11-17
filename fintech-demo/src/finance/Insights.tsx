import { useRef, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowUp, Check, Copy, PiggyBank, ScanSearch, Sparkles, X } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Button } from "@/components/arc/button/button";
import { Drawer, DrawerContent } from "@/components/arc/drawer/drawer";
import { TextShimmer } from "@/components/arc/text-shimmer/text-shimmer";
import { money, prompts, type InsightTone } from "./data";
import type { Cove } from "./useCove";
import styles from "./Insights.module.css";

const { duration, ease, spring, blur, stagger } = motionTokens;

const toneIcon: Record<InsightTone, typeof PiggyBank> = { save: PiggyBank, risk: AlertTriangle, duplicate: Copy, anomaly: ScanSearch };
const toneName: Record<InsightTone, string> = { save: "Saving", risk: "Budget risk", duplicate: "Overlap", anomaly: "Anomaly" };

export function InsightsDrawer({ cove, open, onOpenChange }: { cove: Cove; open: boolean; onOpenChange: (open: boolean) => void }) {
  const reduced = useReducedMotion() ?? false;
  const input = useRef<HTMLInputElement>(null);
  const { ready, items, done, answer, draft, setDraft, ask } = cove;
  const savings = items.filter(item => item.tone === "save" || item.tone === "duplicate").reduce((sum, item) => sum + item.amount, 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim()) ask(draft.trim());
  };

  return <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent title="Cove Intelligence" side="right" className={styles.drawer}
      // With a mouse or trackpad the cursor lands in the question field; on touch it waits, so the keyboard does not cover the insights.
      onOpenAutoFocus={event => { if (matchMedia("(pointer: fine)").matches) { event.preventDefault(); input.current?.focus(); } }}>
      <div className={styles.inner}>
        <div className={styles.status}>
          <span className={styles.badge} aria-hidden="true"><Sparkles size={15} strokeWidth={1.75} /></span>
          <TextShimmer className={styles.statusText} active={!ready}>
            {ready ? `${items.length} ${items.length === 1 ? "insight" : "insights"} · updated just now` : "Reading 1,284 transactions"}
          </TextShimmer>
          <p className={styles.savings} data-shown={ready || undefined}>
            <span className={styles.savingsValue}><AnimatedCounter value={ready ? savings : 0} prefix="$" /></span>
            <span> a year saved</span>
          </p>
        </div>

        <ul className={styles.cards} aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            {!ready && [0, 1, 2].map(slot => <motion.li key={`ghost-${slot}`} className={styles.ghost} aria-hidden="true"
              exit={{ opacity: 0, filter: `blur(${blur.soft}px)`, transition: { duration: duration.exit } }}
              style={{ animationDelay: `${slot * 140}ms` }} />)}
            {ready && items.map((item, index) => {
              const Icon = toneIcon[item.tone];
              return <motion.li key={item.id} layout={!reduced} className={styles.card} data-tone={item.tone}
                initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px) scale(.98)", filter: `blur(${blur.soft}px)` }}
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)", transition: reduced ? { duration: duration.fast } : { ...spring.smooth, delay: .05 + index * stagger.line } }}
                exit={{ opacity: 0, transform: "scale(.96)", filter: `blur(${blur.soft}px)`, transition: { duration: duration.exit, ease: [...ease.standard] } }}
                transition={reduced ? { duration: 0 } : spring.smooth}>
                <div className={styles.cardTop}>
                  <span className={styles.tone}><Icon size={14} strokeWidth={1.9} aria-hidden="true" />{toneName[item.tone]}</span>
                  <button type="button" className={styles.dismiss} aria-label={`Dismiss: ${item.title}`} onClick={() => cove.dismiss(item.id)}>
                    <X size={14} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardBody}>{item.body}</p>
                <div className={styles.cardFoot}>
                  <p className={styles.amount}><b>{money(item.amount)}</b> <span>{item.amountLabel}</span></p>
                  <Button variant={done[item.id] ? "ghost" : "secondary"} size="sm" className={styles.action} data-done={done[item.id] || undefined}
                    onClick={() => cove.toggleDone(item.id)} aria-pressed={!!done[item.id]}>
                    {done[item.id] ? <><Check size={14} strokeWidth={2} aria-hidden="true" />Added to tasks</> : item.action}
                  </Button>
                </div>
              </motion.li>;
            })}
            {ready && items.length === 0 && <motion.li key="empty" className={styles.empty}
              initial={{ opacity: 0, filter: `blur(${blur.soft}px)` }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: duration.standard, ease: [...ease.enter], delay: .15 }}>
              <Check size={16} strokeWidth={2} aria-hidden="true" />Nothing else stands out. Cove will flag the next thing worth your time.
            </motion.li>}
          </AnimatePresence>
        </ul>

        <div className={styles.ask}>
          <AnimatePresence initial={false}>
            {answer && <motion.div key="answer" className={styles.answerClip}
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: { duration: duration.exit, ease: [...ease.exit] } }}
              transition={reduced ? { duration: 0 } : spring.smooth}>
              <div className={styles.answer} aria-live="polite">
                <p className={styles.question}>{answer.question}</p>
                <div className={styles.reply}>
                  <span className={styles.replyMark} aria-hidden="true"><Sparkles size={13} strokeWidth={1.9} /></span>
                  {answer.phase === "thinking"
                    ? <TextShimmer className={styles.thinking}>Looking through the ledger</TextShimmer>
                    : <p className={styles.replyText} key={answer.id}>
                      {answer.text.split(" ").map((word, index) => <motion.span key={index} className={styles.word}
                        // Reopening the drawer shows a finished answer at once instead of streaming it again.
                        initial={reduced || answer.phase === "done" ? false : { opacity: 0, filter: `blur(${blur.soft}px)`, transform: "translateY(2px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
                        transition={{ duration: duration.standard, ease: [...ease.enter], delay: reduced ? 0 : index * stagger.word }}>{word} </motion.span>)}
                    </p>}
                  <button type="button" className={styles.clear} aria-label="Clear answer" onClick={cove.clearAnswer}><X size={14} strokeWidth={1.9} aria-hidden="true" /></button>
                </div>
              </div>
            </motion.div>}
          </AnimatePresence>
          <div className={styles.chips}>
            {prompts.map(prompt => <button key={prompt.id} type="button" className={styles.chip} onClick={() => ask(prompt.question)} data-current={answer?.question === prompt.question || undefined}>{prompt.question}</button>)}
          </div>
          <form className={styles.field} onSubmit={submit}>
            <Sparkles className={styles.fieldIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
            <input ref={input} className={styles.input} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask anything about your spend" aria-label="Ask Cove" />
            <button type="submit" className={styles.send} aria-label="Ask" disabled={!draft.trim()}><ArrowUp size={16} strokeWidth={2} aria-hidden="true" /></button>
          </form>
        </div>
      </div>
    </DrawerContent>
  </Drawer>;
}
