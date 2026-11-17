import { useEffect, useState } from "react";
import { ArrowLeftRight, LayoutGrid, PiggyBank, Repeat, Store, type LucideIcon } from "lucide-react";

/** Every page of Cove. A page marked not ready renders a placeholder until it lands. */
export type RouteId = "overview" | "transactions" | "vendors" | "subscriptions" | "budgets";
export interface Route { id: RouteId; label: string; icon: LucideIcon; blurb: string; ready: boolean }

export const routes: Route[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, blurb: "Where the money went, where it is going, and what needs you.", ready: true },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight, blurb: "Every card swipe, transfer and bill, matched to receipts and categorised as it lands.", ready: true },
  { id: "vendors", label: "Vendors", icon: Store, blurb: "Who you pay, how much, on what terms, and who owns each relationship.", ready: true },
  { id: "subscriptions", label: "Subscriptions", icon: Repeat, blurb: "Every recurring charge, its seats and its renewal date, with idle licences called out.", ready: true },
  { id: "budgets", label: "Budgets", icon: PiggyBank, blurb: "Plans by team and category, with live pacing and owners who get nudged before they overspend.", ready: true },
];

const parse = (): RouteId => {
  const id = location.hash.replace(/^#\/?/, "") as RouteId;
  return routes.some(route => route.id === id) ? id : "overview";
};

export const hrefFor = (id: RouteId) => id === "overview" ? "#/" : `#/${id}`;

/** Hash routing keeps the demo a static site: no server rewrites needed wherever it is hosted. */
export function useRoute() {
  const [route, setRoute] = useState<RouteId>(parse);
  useEffect(() => {
    const sync = () => { setRoute(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return route;
}
