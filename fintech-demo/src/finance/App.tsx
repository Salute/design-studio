import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { Button } from "@/components/arc/button/button";
import { MorphSelect } from "@/components/arc/morph-select/morph-select";
import { ThemeSwitch, type Theme } from "@/components/arc/theme-switch/theme-switch";
import { ToastStack, ToastStackProvider, useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { workspaces } from "./data";
import { Dock } from "./Dock";
import { InsightsDrawer } from "./Insights";
import { useCove } from "./useCove";
import { Overview } from "./Overview";
import { Placeholder } from "./Placeholder";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { VendorsPage } from "./pages/VendorsPage";
import { routes, useRoute } from "./routes";
import styles from "./App.module.css";

const { duration, ease, blur } = motionTokens;

export function App() {
  return <ToastStackProvider duration={5000}>
    <Shell />
    <ToastStack position="bottom-right" label="Notifications" />
  </ToastStackProvider>;
}

function Shell() {
  const reduced = useReducedMotion() ?? false;
  const route = useRoute();
  const { toast } = useToastStack();
  const [workspace, setWorkspace] = useState("halcyon");
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  // Signals from the shell into the page: each press bumps a counter the page reacts to.
  const [draftSignal, setDraftSignal] = useState(0);
  const cove = useCove();
  const [coveOpen, setCoveOpen] = useState(false);

  const changeTheme = (next: Theme) => {
    const apply = () => { document.documentElement.dataset.theme = next; setTheme(next); };
    try { localStorage.setItem("theme", next); } catch { /* storage can be unavailable; the theme still applies */ }
    const transition = (document as Document & { startViewTransition?: (update: () => void) => unknown }).startViewTransition;
    if (transition && !reduced) transition.call(document, apply); else apply();
  };

  const newExpense = () => {
    if (route === "overview") setDraftSignal(n => n + 1);
    else toast({ type: "success", title: "Expense drafted", description: "Add a receipt from Transactions when it lands." });
  };

  // Ask Cove in the dock opens Cove Intelligence over whatever page you are on.
  const openCove = (next: boolean) => {
    setCoveOpen(next);
    if (next) cove.markOpened();
  };

  const current = routes.find(item => item.id === route)!;

  return <>
    <div className={styles.page}>
      <motion.header className={styles.header}
        initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)", filter: `blur(${blur.soft}px)` }}
        animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
        transition={{ duration: duration.considered, ease: [...ease.enter], delay: .05 }}>
        <div className={styles.brand}>
          <a href="#/" className={styles.logoLink} aria-label="Cove, overview"><Logo /></a>
          {/* Logo, slash, company: one lockup that says where you are. The switcher is quiet text until it opens. */}
          <span className={styles.slash} aria-hidden="true">/</span>
          <MorphSelect className={styles.switcher} label="Workspace" hideLabel value={workspace} searchable={false}
            onValueChange={value => { setWorkspace(value); toast({ type: "info", title: `Switched to ${workspaces.find(item => item.value === value)?.label}`, description: "This demo shows Halcyon Labs' numbers for every workspace." }); }}
            items={workspaces.map(item => ({ ...item, icon: <WorkspaceMark name={item.label} /> }))} />
        </div>
        <div className={styles.tools}>
          <ThemeSwitch theme={theme} variant="eclipse" iconOnly onThemeChange={next => changeTheme(next)} />
          <Button className={styles.primary} onClick={newExpense}><Plus size={16} strokeWidth={2} aria-hidden="true" />New expense</Button>
        </div>
      </motion.header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={route} className={styles.view}
          initial={reduced ? { opacity: 0 } : { opacity: 0, filter: `blur(${blur.subtle}px)` }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: duration.standard, ease: [...ease.enter] } }}
          exit={{ opacity: 0, filter: reduced ? "blur(0px)" : `blur(${blur.subtle}px)`, transition: { duration: duration.exit, ease: [...ease.standard] } }}>
          {!current.ready ? <Placeholder route={current} />
            : route === "overview" ? <Overview draftSignal={draftSignal} />
            : route === "transactions" ? <TransactionsPage />
            : route === "vendors" ? <VendorsPage />
            : route === "subscriptions" ? <SubscriptionsPage />
            : <BudgetsPage />}
        </motion.div>
      </AnimatePresence>
    </div>
    <Dock route={route} onAsk={() => openCove(!coveOpen)} asking={cove.asking} coveOpen={coveOpen} unseen={cove.opened ? 0 : cove.items.length} />
    <InsightsDrawer cove={cove} open={coveOpen} onOpenChange={openCove} />
  </>;
}

function Logo() {
  return <svg className={styles.logo} width="40" height="36" viewBox="0 0 40 36" role="img" aria-label="Cove">
    <path d="M29.4 9.2A12 12 0 1 0 29.4 26.8" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
  </svg>;
}

function WorkspaceMark({ name }: { name: string }) {
  return <span className={styles.workspaceMark} aria-hidden="true">{name[0]}</span>;
}
