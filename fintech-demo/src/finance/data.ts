/* Cove demo data. Everything is deterministic so every visit renders the same story. Today is Wednesday, 4 November 2026. */

export type RangeId = "month" | "quarter" | "year";
export type SeriesKey = "spent" | "forecast" | "budget";

export interface SpendPoint { key: string; label: string; spent: number; forecast: number; pace: number }
export interface Spike { index: number; vendor: string; amount: number; note: string }
export interface RangeData {
  points: SpendPoint[];
  now: number;
  edges: [string, string];
  nowLabel: string;
  budget: number;
  spike: Spike;
  stats: { spent: number; budget: number; forecast: number; burn: number };
  changes: { spent: string; forecast: string; burn: string };
  period: string;
}

export const ranges = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
] satisfies { value: RangeId; label: string }[];

export const workspaces = [
  { value: "halcyon", label: "Halcyon Labs" },
  { value: "fieldnote", label: "Fieldnote" },
  { value: "orbit", label: "Orbit Studio" },
];

/** A small seeded generator, so the demo's numbers look organic but never change between visits. */
function seeded(seed: number) {
  let state = seed;
  return () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; };
}

function build(options: { labels: string[]; keys: string[]; now: number; budget: number; base: number; jitter: number; spikes: Record<number, number>; seed: number; forecastLift: number }): SpendPoint[] {
  const random = seeded(options.seed);
  let spent = 0;
  let forecast = 0;
  return options.labels.map((label, index) => {
    const step = options.base * (1 - options.jitter / 2 + random() * options.jitter) + (options.spikes[index] ?? 0);
    if (index <= options.now) { spent += step; forecast = spent; }
    else forecast += step * options.forecastLift;
    const pace = (options.budget * (index + 1)) / options.labels.length;
    return { key: options.keys[index]!, label, spent: Math.round(spent), forecast: Math.round(forecast), pace: Math.round(pace) };
  });
}

const monthLabels = Array.from({ length: 30 }, (_, day) => `Nov ${day + 1}`);
const quarterLabels = Array.from({ length: 13 }, (_, week) => {
  const date = new Date(Date.UTC(2026, 9, 1 + week * 7));
  return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
});
const yearLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function summarize(points: SpendPoint[], now: number, budget: number) {
  const spent = points[now]!.spent;
  const forecast = points[points.length - 1]!.forecast;
  return { spent, budget, forecast, burn: Math.round(spent / (now + 1)) };
}

const month = build({ labels: monthLabels, keys: monthLabels.map((_, i) => `d${i}`), now: 3, budget: 248000, base: 6900, jitter: .9, spikes: { 0: 36200, 2: 14800, 14: 21000, 29: 8000 }, seed: 11, forecastLift: 1.02 });
const quarter = build({ labels: quarterLabels, keys: quarterLabels.map((_, i) => `w${i}`), now: 4, budget: 744000, base: 54000, jitter: .5, spikes: { 1: 19800, 3: 36200, 9: 24000 }, seed: 7, forecastLift: 1.04 });
const year = build({ labels: yearLabels, keys: yearLabels.map((_, i) => `m${i}`), now: 10, budget: 2860000, base: 214000, jitter: .34, spikes: { 2: 42000, 6: 68000, 9: 31000 }, seed: 3, forecastLift: 1 });

export const dataByRange: Record<RangeId, RangeData> = {
  month: {
    points: month, now: 3, edges: ["Nov 1", "Nov 30"], nowLabel: "Today", budget: 248000, period: "November 2026",
    spike: { index: 0, vendor: "Gusto", amount: 42800, note: "Payroll run and benefits" },
    stats: summarize(month, 3, 248000), changes: { spent: "+6.2%", forecast: "-3.1%", burn: "+4.8%" },
  },
  quarter: {
    points: quarter, now: 4, edges: ["Oct 1", "Dec 31"], nowLabel: "This week", budget: 744000, period: "Q4 2026",
    spike: { index: 3, vendor: "AWS", amount: 88400, note: "Reserved instances, 1 year" },
    stats: summarize(quarter, 4, 744000), changes: { spent: "+3.4%", forecast: "+2.2%", burn: "+1.9%" },
  },
  year: {
    points: year, now: 10, edges: ["Jan", "Dec"], nowLabel: "Nov", budget: 2860000, period: "2026",
    spike: { index: 6, vendor: "WeWork", amount: 282000, note: "Second floor lease, Lisbon" },
    stats: summarize(year, 10, 2860000), changes: { spent: "+11.6%", forecast: "-1.4%", burn: "+8.0%" },
  },
};

/* AI insights. Amount is the saving (or risk) the insight is worth, in dollars per year. */
export type InsightTone = "save" | "risk" | "duplicate" | "anomaly";
export interface Insight { id: string; tone: InsightTone; title: string; body: string; amount: number; amountLabel: string; action: string }
export const insights: Insight[] = [
  { id: "seats", tone: "save", title: "11 Figma seats unused for 60 days", body: "Reclaim them before the Dec 2 renewal and the Organization plan drops a tier.", amount: 4950, amountLabel: "saved a year", action: "Review seats" },
  { id: "cloud", tone: "risk", title: "Cloud is running 32% ahead of pace", body: "EC2 in eu-west-1 doubled after the Oct 21 deploy. Rightsizing three instance groups brings it back.", amount: 9400, amountLabel: "over this month", action: "Open breakdown" },
  { id: "overlap", tone: "duplicate", title: "Loom and Vimeo do the same job", body: "Both bill the Design team for async video. 14 of 16 people use Loom weekly.", amount: 1440, amountLabel: "saved a year", action: "Compare usage" },
  { id: "uber", tone: "anomaly", title: "An unusual $1,286 Uber charge", body: "Nine times this card's typical ride, on Oct 30 at 2:14am. Jordan has been asked to confirm.", amount: 1286, amountLabel: "under review", action: "View charge" },
];

export const prompts = [
  { id: "cloud", question: "Why is cloud over budget?", answer: "EC2 spend in eu-west-1 rose from $1.1k to $2.3k a day after the Oct 21 deploy. Three autoscaling groups never scaled back down. Fixing their minimum size saves about $9.4k this month." },
  { id: "renew", question: "What renews in the next 30 days?", answer: "Seven subscriptions, $34.6k in total. Figma on Dec 2 is the largest at $10.8k, and 11 of its 24 seats have been idle since September." },
  { id: "change", question: "Biggest change from last month?", answer: "Marketing is up 41% after the Lisbon offsite deposit and two new ad channels. Everything else moved less than 6%." },
];

/* Approvals waiting on finance. */
export interface Approval { id: string; name: string; team: string; item: string; amount: number; when: string; policy: string }
export const approvals: Approval[] = [
  { id: "a1", name: "Maya Chen", team: "Design", item: "Figma Organization upgrade", amount: 2400, when: "2h ago", policy: "Software over $2k" },
  { id: "a2", name: "Leo Park", team: "Engineering", item: "Datadog annual commit", amount: 18000, when: "5h ago", policy: "New annual contract" },
  { id: "a3", name: "Priya Raman", team: "Marketing", item: "Offsite venue deposit, Lisbon", amount: 6250, when: "Yesterday", policy: "Travel over $5k" },
  { id: "a4", name: "Sam Okafor", team: "Sales", item: "Client dinner, 6 guests", amount: 840, when: "Yesterday", policy: "Meals over $500" },
];

/* Q4 budgets, by category. Today is day 35 of the quarter's 92. */
export const quarterProgress = 35 / 92;
export interface Budget { id: string; name: string; spent: number; budget: number; owner: string }
export const budgets: Budget[] = [
  { id: "cloud", name: "Cloud & infrastructure", spent: 84600, budget: 168000, owner: "Leo Park" },
  { id: "marketing", name: "Marketing", spent: 62400, budget: 150000, owner: "Priya Raman" },
  { id: "software", name: "Software", spent: 48900, budget: 132000, owner: "Maya Chen" },
  { id: "office", name: "Office", spent: 41200, budget: 126000, owner: "Ana Silva" },
  { id: "contractors", name: "Contractors", spent: 31000, budget: 108000, owner: "Ana Silva" },
  { id: "travel", name: "Travel & meals", spent: 24500, budget: 60000, owner: "Sam Okafor" },
];

/* Vendors, with a hue for their monogram. Monograms stand in for logos, so no third-party mark is reproduced. */
export interface Vendor { name: string; category: string; spend: number; change: string; hue: number }
export const vendors: Vendor[] = [
  { name: "AWS", category: "Cloud", spend: 61200, change: "+18%", hue: 55 },
  { name: "Gusto", category: "Payroll", spend: 42800, change: "+2%", hue: 20 },
  { name: "WeWork", category: "Office", spend: 23500, change: "0%", hue: 270 },
  { name: "Google Ads", category: "Marketing", spend: 19400, change: "+41%", hue: 145 },
  { name: "Figma", category: "Software", spend: 10800, change: "-4%", hue: 320 },
  { name: "Delta", category: "Travel", spend: 8900, change: "+12%", hue: 240 },
  { name: "Datadog", category: "Cloud", spend: 7600, change: "+9%", hue: 290 },
  { name: "Salesforce", category: "Sales", spend: 6400, change: "0%", hue: 215 },
];

/* Subscriptions renewing in the next 30 days. `in` is days from today. */
export interface Renewal { id: string; name: string; plan: string; amount: number; in: number; date: string; hue: number; flag?: string }
export const renewals: Renewal[] = [
  { id: "slack", name: "Slack", plan: "Business+ · 48 seats", amount: 4200, in: 3, date: "Nov 7", hue: 300 },
  { id: "notion", name: "Notion", plan: "Plus · 40 seats", amount: 1920, in: 9, date: "Nov 13", hue: 0 },
  { id: "linear", name: "Linear", plan: "Business · 28 seats", amount: 2016, in: 14, date: "Nov 18", hue: 265 },
  { id: "github", name: "GitHub", plan: "Team · 31 seats", amount: 1488, in: 17, date: "Nov 21", hue: 220 },
  { id: "datadog", name: "Datadog", plan: "Pro · usage based", amount: 9600, in: 22, date: "Nov 26", hue: 290 },
  { id: "figma", name: "Figma", plan: "Organization · 24 seats", amount: 10800, in: 28, date: "Dec 2", hue: 320, flag: "11 idle seats" },
];

/* Transactions. Status drives the chip; `receipt` means a receipt is still missing. */
export type TxStatus = "cleared" | "pending" | "receipt" | "draft";
export interface Transaction { id: string; vendor: string; category: string; person: string; card: string; amount: number; when: string; status: TxStatus; hue: number }
export const transactions: Transaction[] = [
  { id: "t1", vendor: "AWS", category: "Cloud", person: "Leo Park", card: "4821", amount: 2318.42, when: "9:41", status: "pending", hue: 55 },
  { id: "t2", vendor: "Blue Bottle", category: "Meals", person: "Sam Okafor", card: "1173", amount: 48.6, when: "9:12", status: "receipt", hue: 230 },
  { id: "t3", vendor: "Figma", category: "Software", person: "Maya Chen", card: "9902", amount: 900, when: "Yesterday", status: "cleared", hue: 320 },
  { id: "t4", vendor: "Delta", category: "Travel", person: "Priya Raman", card: "5530", amount: 1264.1, when: "Yesterday", status: "receipt", hue: 240 },
  { id: "t5", vendor: "Gusto", category: "Payroll", person: "Ana Silva", card: "ACH", amount: 42800, when: "Nov 1", status: "cleared", hue: 20 },
];

/** Card swipes that arrive while the page is open. */
export const incoming: Omit<Transaction, "id" | "when">[] = [
  { vendor: "Uber", category: "Travel", person: "Jordan Lee", card: "7714", amount: 32.4, status: "receipt", hue: 200 },
  { vendor: "OpenAI", category: "Software", person: "Leo Park", card: "4821", amount: 620, status: "pending", hue: 170 },
  { vendor: "Sweetgreen", category: "Meals", person: "Maya Chen", card: "9902", amount: 86.25, status: "receipt", hue: 140 },
  { vendor: "Vercel", category: "Cloud", person: "Leo Park", card: "4821", amount: 412, status: "pending", hue: 250 },
];

export const money = (value: number, digits = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const compact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1000) return `$${(value / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `$${Math.round(value)}`;
};
