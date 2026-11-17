import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { Check, ChevronRight, Download, FileText, Link2, ListFilter, Paperclip, Sparkles } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { Drawer, DrawerContent, useDrawerItem } from "@/components/arc/drawer/drawer";
import { DropdownMenu } from "@/components/arc/dropdown-menu/dropdown-menu";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { money } from "../data";
import { days, ledger, type LedgerTx, type TxStatus } from "../ledger";
import { Monogram } from "../Monogram";
import { NoResults, Page, PageToolbar, PillMenu, PillSearch, Region, Stat, Stats } from "../Page";
import panel from "../Panel.module.css";
import styles from "./TransactionsPage.module.css";

const { duration, ease, spring, blur } = motionTokens;
type Filter = "all" | "pending" | "receipt" | "cleared";
const statusLabel: Record<TxStatus, string> = { cleared: "Cleared", pending: "Pending", receipt: "Needs receipt", draft: "Draft" };
const categories = Array.from(new Set(ledger.map(tx => tx.category))).sort();

/* Filtering and searching happen tens of times a day, so list motion stays brief: rows fade in 150ms and the ones that stay
   slide to their new place on a short spring. Nothing scales or blurs here. */
const rowIn: Transition = { opacity: { duration: .15, ease: [...ease.enter] }, layout: spring.snappy };
const rowOut: Transition = { duration: .12, ease: [...ease.standard] };

export function TransactionsPage() {
  const reduced = useReducedMotion() ?? false;
  const { toast } = useToastStack();
  const [rows, setRows] = useState<LedgerTx[]>(ledger);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const searched = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(tx => words.every(word => `${tx.vendor} ${tx.category} ${tx.person} ${tx.memo ?? ""} ${tx.amount}`.toLowerCase().includes(word)));
  }, [rows, query]);
  const shown = searched.filter(tx => filter === "all" || tx.status === filter);
  const sum = (list: LedgerTx[]) => list.reduce((total, tx) => total + tx.amount, 0);
  const of = (status: TxStatus) => searched.filter(tx => tx.status === status);

  const open = rows.find(tx => tx.id === openId) ?? null;
  const shownTx = useDrawerItem(open);

  const update = (id: string, patch: Partial<LedgerTx>) => setRows(current => current.map(tx => tx.id === id ? { ...tx, ...patch } : tx));
  const pick = (next: Filter) => setFilter(current => current === next && next !== "all" ? "all" : next);

  const filterStat = (key: Filter, label: string, list: LedgerTx[], badge: string, tone: "neutral" | "warning" | "info" | "success" = "neutral") =>
    <Stat label={label} kind="filter" pressed={filter === key} onClick={() => pick(key)} ariaLabel={`Show ${key === "all" ? "all transactions" : label.toLowerCase()}`}
      badge={<Badge tone={tone} size="sm">{badge}</Badge>}>
      <AnimatedCounter value={Math.round(sum(list))} prefix="$" animateOnView />
    </Stat>;

  const groups = days.map(day => ({ ...day, items: shown.filter(tx => tx.day === day.day) })).filter(group => group.items.length > 0);

  return <Page>
    <PageToolbar title="Transactions" meta="Last 7 days">
      <PillSearch label="Search transactions" value={query} onValueChange={setQuery} placeholder="Search transactions" />
      <PillMenu><DropdownMenu label="View" icon={<ListFilter size={16} strokeWidth={1.75} />} items={[
        { label: linkCopied ? "Link copied" : "Copy link", icon: <Link2 size={16} strokeWidth={1.75} />, onSelect: () => { void navigator.clipboard?.writeText(location.href); setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 2000); } },
        { label: "Export CSV", icon: <Download size={16} strokeWidth={1.75} />, separatorBefore: true, onSelect: () => exportCsv(shown) },
      ]} /></PillMenu>
    </PageToolbar>

    {/* The stats are the list's filters: pick one to narrow the list, pick it again to go back to all. */}
    <Stats label="Filters">
      {filterStat("all", "All", searched, `${searched.length} transactions`)}
      {filterStat("pending", "Pending", of("pending"), `${of("pending").length} settling`, "info")}
      {filterStat("receipt", "Needs receipt", of("receipt"), of("receipt").length ? `${of("receipt").length} missing` : "All matched", of("receipt").length ? "warning" : "success")}
      {filterStat("cleared", "Cleared", of("cleared"), `${of("cleared").length} cleared`, "success")}
    </Stats>

    <Region as="section" className={`${panel.panel} ${styles.panel}`} aria-label="Transactions">
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map(group => <motion.div key={group.day} layout={reduced ? false : "position"} className={styles.group}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: rowOut }} transition={reduced ? { duration: duration.fast } : rowIn}>
          <header className={styles.groupHead}>
            <h2 className={styles.groupTitle}>{group.label}<span>{group.date}</span></h2>
            <span className={styles.groupTotal}>{money(sum(group.items), 2)}</span>
          </header>
          <ul className={styles.list}>
            <AnimatePresence initial={false} mode="popLayout">
              {group.items.map(tx => <motion.li key={tx.id} layout={reduced ? false : "position"}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: rowOut }} transition={reduced ? { duration: duration.fast } : rowIn}>
                <button type="button" className={styles.row} onClick={() => setOpenId(tx.id)} data-open={openId === tx.id || undefined}
                  aria-label={`${tx.vendor}, ${money(tx.amount, 2)}, ${statusLabel[tx.status]}. Open details`}>
                  <Monogram name={tx.vendor} size={32} />
                  <span className={styles.what}>
                    <span className={styles.vendor}>{tx.vendor}</span>
                    <span className={styles.sub}>{tx.memo ?? tx.category}</span>
                  </span>
                  <span className={styles.person}>{tx.person}<span className={styles.card}>{tx.card === "ACH" ? "ACH" : `•• ${tx.card}`}</span></span>
                  <span className={styles.statusCell}><StatusChip status={tx.status} /></span>
                  <span className={styles.amount}>{money(tx.amount, 2)}</span>
                  <ChevronRight className={styles.chevron} size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </motion.li>)}
            </AnimatePresence>
          </ul>
        </motion.div>)}
        {groups.length === 0 && <NoResults key="none" onReset={() => { setQuery(""); setFilter("all"); }} resetLabel="Clear search and filters">
          Nothing matches {query ? <>“{query}”</> : "this filter"}{query && filter !== "all" ? " with this filter" : ""}.
        </NoResults>}
      </AnimatePresence>
    </Region>

    <Drawer open={open !== null} onOpenChange={next => { if (!next) setOpenId(null); }}>
      {shownTx && <DrawerContent title={shownTx.vendor} description={`${shownTx.category} · ${days.find(day => day.day === shownTx.day)?.date} at ${shownTx.time}`}>
        <TxDetail tx={shownTx} onChange={patch => update(shownTx.id, patch)}
          onMatched={() => toast({ type: "success", title: "Receipt matched", description: `${shownTx.vendor}, ${money(shownTx.amount, 2)}. Cove found it in ${shownTx.person.split(" ")[0]}'s email.` })} />
      </DrawerContent>}
    </Drawer>
  </Page>;
}

function StatusChip({ status }: { status: TxStatus }) {
  const reduced = useReducedMotion() ?? false;
  return <AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={status} className={styles.chip} data-status={status}
      initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(.96)", filter: `blur(${blur.subtle}px)` }}
      animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
      exit={{ opacity: 0, transition: { duration: duration.exit } }}
      transition={{ duration: .2, ease: [...ease.enter] }}>
      {status === "cleared" && <Check size={12} strokeWidth={2.4} aria-hidden="true" />}{statusLabel[status]}
    </motion.span>
  </AnimatePresence>;
}

/** The drawer body: amount, details, the receipt, and what has happened to the charge so far. */
function TxDetail({ tx, onChange, onMatched }: { tx: LedgerTx; onChange: (patch: Partial<LedgerTx>) => void; onMatched: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const [matching, setMatching] = useState(false);
  const match = () => {
    setMatching(true);
    window.setTimeout(() => { setMatching(false); onChange({ status: "cleared" }); onMatched(); }, reduced ? 200 : 1100);
  };
  const hasReceipt = tx.status === "cleared";
  const events = [
    { label: "Charged", detail: `${tx.card === "ACH" ? "ACH transfer" : `Card •• ${tx.card}`} · ${tx.time}`, done: true },
    { label: "Categorised by Cove", detail: tx.category, done: true },
    { label: tx.status === "pending" ? "Settling" : "Settled", detail: tx.status === "pending" ? "Usually 1–2 days" : "With the card network", done: tx.status !== "pending" },
    { label: hasReceipt ? "Receipt matched" : "Waiting for a receipt", detail: hasReceipt ? "From email" : "Ask the cardholder or match one", done: hasReceipt },
  ];

  return <div className={styles.detail}>
    <div className={styles.hero}>
      <Monogram name={tx.vendor} size={44} />
      <div>
        <p className={styles.heroAmount}>{money(tx.amount, 2)}</p>
        <StatusChip status={tx.status} />
      </div>
    </div>

    <dl className={styles.facts}>
      <div><dt>Paid by</dt><dd>{tx.person}</dd></div>
      <div><dt>Card</dt><dd>{tx.card === "ACH" ? "ACH transfer" : `•• ${tx.card}`}</dd></div>
      <div className={styles.factSelect}><dt>Category</dt><dd>
        <MorphSelect label="Category" hideLabel value={tx.category} searchable={false} align="end" items={categories.map(name => ({ value: name, label: name }))} onValueChange={category => onChange({ category })} />
      </dd></div>
      {tx.memo && <div><dt>Memo</dt><dd>{tx.memo}</dd></div>}
    </dl>

    <section className={styles.receipt} aria-label="Receipt">
      <AnimatePresence mode="popLayout" initial={false}>
        {hasReceipt
          ? <motion.div key="has" className={styles.receiptCard}
            initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(.98)", filter: `blur(${blur.soft}px)` }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" }} transition={reduced ? { duration: duration.fast } : spring.smooth}>
            <FileText size={18} strokeWidth={1.75} aria-hidden="true" />
            <span><b>receipt-{tx.vendor.toLowerCase().replace(/\s+/g, "-")}-{tx.id}.pdf</b><span>Matched {money(tx.amount, 2)} exactly</span></span>
            <Check className={styles.receiptCheck} size={16} strokeWidth={2.2} aria-hidden="true" />
          </motion.div>
          : <motion.div key="none" className={styles.receiptEmpty} exit={{ opacity: 0, transition: { duration: duration.exit } }}>
            <Paperclip size={18} strokeWidth={1.75} aria-hidden="true" />
            <p>{tx.status === "pending" ? "No receipt yet. Cove looks for one once the charge settles." : "No receipt yet."}</p>
            {tx.status !== "pending" && <Button variant="secondary" size="sm" loading={matching} onClick={match}><Sparkles size={14} strokeWidth={1.9} aria-hidden="true" />Find with Cove</Button>}
          </motion.div>}
      </AnimatePresence>
    </section>

    <section aria-label="Activity">
      <h3 className={styles.sectionTitle}>Activity</h3>
      <ol className={styles.timeline}>
        {events.map(event => <li key={event.label} data-done={event.done || undefined}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.eventLabel}>{event.label}</span>
          <span className={styles.eventDetail}>{event.detail}</span>
        </li>)}
      </ol>
    </section>
  </div>;
}

function exportCsv(rows: LedgerTx[]) {
  const lines = ["date,vendor,category,person,card,amount,status", ...rows.map(tx => `${days.find(day => day.day === tx.day)?.date},${tx.vendor},${tx.category},${tx.person},${tx.card},${tx.amount},${tx.status}`)];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: "transactions.csv" }).click();
  URL.revokeObjectURL(url);
}
