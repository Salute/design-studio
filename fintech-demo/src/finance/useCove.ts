import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { insights as seedInsights, prompts, type Insight } from "./data";

const { stagger } = motionTokens;

type Answer = { id: number; question: string; text: string; phase: "thinking" | "streaming" | "done" };

/**
 * Cove Intelligence lives in the app shell, not in a page: it opens from any page, and what you dismissed or asked
 * is still there when you open it again. The drawer's contents unmount on close, so the state sits in this hook.
 */
export function useCove() {
  const reduced = useReducedMotion() ?? false;
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Insight[]>(seedInsights);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [draft, setDraft] = useState("");
  const answerCount = useRef(0);

  // Cove reads the ledger the first time the drawer opens, then lays out what it found.
  useEffect(() => {
    if (!opened || ready) return;
    const timer = window.setTimeout(() => setReady(true), reduced ? 200 : 2100);
    return () => window.clearTimeout(timer);
  }, [opened, ready, reduced]);

  // Thinking, then the answer streams in word by word, then it settles.
  useEffect(() => {
    if (!answer || answer.phase === "done") return;
    const words = answer.text.split(" ").length;
    const wait = answer.phase === "thinking" ? (reduced ? 150 : 1100) : (reduced ? 0 : words * stagger.word * 1000 + 400);
    const timer = window.setTimeout(() => setAnswer(current => current && current.id === answer.id ? { ...current, phase: current.phase === "thinking" ? "streaming" : "done" } : current), wait);
    return () => window.clearTimeout(timer);
  }, [answer, reduced]);

  const ask = useCallback((question: string) => {
    const match = prompts.find(prompt => prompt.question === question)
      ?? prompts.find(prompt => question.toLowerCase().split(/\W+/).some(word => word.length > 3 && prompt.question.toLowerCase().includes(word)));
    const text = match?.answer ?? "This demo answers questions about cloud spend, upcoming renewals and month-over-month changes. Try one of the suggestions below.";
    answerCount.current += 1;
    setAnswer({ id: answerCount.current, question: match?.question ?? question, text, phase: "thinking" });
    setDraft("");
  }, []);

  return {
    opened, markOpened: () => setOpened(true), ready, items, done, answer, draft, setDraft, ask,
    asking: answer !== null && answer.phase !== "done",
    dismiss: (id: string) => setItems(current => current.filter(item => item.id !== id)),
    toggleDone: (id: string) => setDone(current => ({ ...current, [id]: !current[id] })),
    clearAnswer: () => setAnswer(null),
  };
}

export type Cove = ReturnType<typeof useCove>;
