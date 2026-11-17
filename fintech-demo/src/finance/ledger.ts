/* Data for the Transactions, Vendors, Subscriptions and Budgets pages. It tells the same story as the Overview:
   today is Wednesday 4 November 2026, Cloud is running ahead of budget, and Figma has 11 idle seats. */

export type TxStatus = "cleared" | "pending" | "receipt" | "draft";
export interface LedgerTx {
  id: string; vendor: string; category: string; person: string; card: string; amount: number;
  day: number; time: string; status: TxStatus; memo?: string;
}

/** Days back from today (0 is today), with the label each group shows. */
export const days = [
  { day: 0, label: "Today", date: "Wed, Nov 4" },
  { day: 1, label: "Yesterday", date: "Tue, Nov 3" },
  { day: 2, label: "Monday", date: "Mon, Nov 2" },
  { day: 3, label: "Sunday", date: "Sun, Nov 1" },
  { day: 4, label: "Saturday", date: "Sat, Oct 31" },
  { day: 5, label: "Friday", date: "Fri, Oct 30" },
  { day: 6, label: "Thursday", date: "Thu, Oct 29" },
];

const rows: [string, string, string, string, number, number, string, TxStatus, string?][] = [
  ["AWS", "Cloud", "Leo Park", "4821", 2318.42, 0, "9:41", "pending", "EC2, eu-west-1"],
  ["Blue Bottle", "Meals", "Sam Okafor", "1173", 48.6, 0, "9:12", "receipt"],
  ["Linear", "Software", "Maya Chen", "9902", 168, 0, "8:30", "cleared", "Business plan, monthly"],
  ["Figma", "Software", "Maya Chen", "9902", 900, 1, "17:05", "cleared", "Seat add-on, 2 editors"],
  ["Delta", "Travel", "Priya Raman", "5530", 1264.1, 1, "14:22", "receipt", "LIS → JFK, offsite scouting"],
  ["Google Ads", "Marketing", "Priya Raman", "5530", 3400, 1, "11:00", "pending", "Q4 launch campaign"],
  ["Uber", "Travel", "Jordan Lee", "7714", 1286, 1, "02:14", "pending", "Flagged by Cove: unusual amount"],
  ["Notion", "Software", "Ana Silva", "3308", 160, 2, "16:40", "cleared"],
  ["Datadog", "Cloud", "Leo Park", "4821", 812.55, 2, "10:15", "cleared", "Log ingestion overage"],
  ["Sweetgreen", "Meals", "Maya Chen", "9902", 86.25, 2, "12:48", "receipt"],
  ["Vercel", "Cloud", "Leo Park", "4821", 412, 2, "09:02", "cleared"],
  ["Gusto", "Payroll", "Ana Silva", "ACH", 42800, 3, "06:00", "cleared", "Payroll run, Nov 1"],
  ["WeWork", "Office", "Ana Silva", "ACH", 23500, 3, "06:00", "cleared", "Lisbon lease, November"],
  ["Slack", "Software", "Ana Silva", "3308", 350, 3, "07:30", "cleared"],
  ["Hertz", "Travel", "Sam Okafor", "1173", 312.8, 4, "18:20", "receipt", "Client visit, Porto"],
  ["OpenAI", "Software", "Leo Park", "4821", 620, 4, "10:05", "cleared", "API usage, October"],
  ["Staples", "Office", "Ana Silva", "3308", 146.3, 5, "15:12", "cleared"],
  ["AWS", "Cloud", "Leo Park", "4821", 2104.9, 5, "09:40", "cleared", "EC2, eu-west-1"],
  ["Meta Ads", "Marketing", "Priya Raman", "5530", 2150, 5, "11:30", "cleared", "Retargeting, week 44"],
  ["Upwork", "Contractors", "Ana Silva", "ACH", 4800, 5, "08:00", "pending", "Illustration, launch assets"],
  ["Blue Bottle", "Meals", "Leo Park", "4821", 32.4, 6, "08:55", "cleared"],
  ["GitHub", "Software", "Leo Park", "4821", 124, 6, "07:00", "cleared"],
  ["Marriott", "Travel", "Priya Raman", "5530", 684, 6, "21:10", "receipt", "Offsite venue walk-through"],
  ["Deel", "Contractors", "Ana Silva", "ACH", 7200, 6, "06:00", "cleared", "October contractors"],
];

export const ledger: LedgerTx[] = rows.map(([vendor, category, person, card, amount, day, time, status, memo], index) => ({ id: `tx${index + 1}`, vendor, category, person, card, amount, day, time, status, memo }));

/* Vendors. `monthly` is the last twelve months, December 2025 to November 2026 (November so far). */
export interface VendorRecord {
  id: string; name: string; category: string; owner: string; quarter: number; change: number;
  monthly: number[]; terms: string; contract: string; since: string; status: "active" | "review" | "new";
}

export const vendorRecords: VendorRecord[] = [
  { id: "aws", name: "AWS", category: "Cloud", owner: "Leo Park", quarter: 84600, change: 18, monthly: [38, 40, 39, 42, 44, 43, 47, 49, 52, 56, 61, 24], terms: "Card, monthly", contract: "Reserved instances to Oct 2027", since: "2021", status: "review" },
  { id: "gusto", name: "Gusto", category: "Payroll", owner: "Ana Silva", quarter: 85600, change: 2, monthly: [41, 41, 41, 42, 42, 42, 42, 42, 43, 43, 43, 43], terms: "ACH, monthly", contract: "Rolling", since: "2020", status: "active" },
  { id: "wework", name: "WeWork", category: "Office", owner: "Ana Silva", quarter: 47000, change: 0, monthly: [18, 18, 18, 18, 18, 18, 23.5, 23.5, 23.5, 23.5, 23.5, 23.5], terms: "ACH, monthly", contract: "Lease to Jun 2028", since: "2022", status: "active" },
  { id: "googleads", name: "Google Ads", category: "Marketing", owner: "Priya Raman", quarter: 31200, change: 41, monthly: [8, 7, 9, 10, 9, 11, 12, 12, 13, 14, 19, 7], terms: "Card, as billed", contract: "No contract", since: "2022", status: "active" },
  { id: "figma", name: "Figma", category: "Software", owner: "Maya Chen", quarter: 10800, change: -4, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10.8, 0], terms: "Card, annual", contract: "Renews Dec 2", since: "2021", status: "review" },
  { id: "delta", name: "Delta", category: "Travel", owner: "Sam Okafor", quarter: 14600, change: 12, monthly: [4, 3, 6, 5, 7, 4, 3, 5, 6, 8, 9, 3], terms: "Card, as billed", contract: "Corporate fares to 2027", since: "2023", status: "active" },
  { id: "datadog", name: "Datadog", category: "Cloud", owner: "Leo Park", quarter: 15400, change: 9, monthly: [5, 5, 5.5, 5.5, 6, 6, 6.5, 6.5, 7, 7.2, 7.6, 2.4], terms: "Card, monthly", contract: "Annual commit pending", since: "2022", status: "new" },
  { id: "salesforce", name: "Salesforce", category: "Sales", owner: "Sam Okafor", quarter: 12800, change: 0, monthly: [6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4], terms: "Invoice, net 30", contract: "Renews Mar 2027", since: "2021", status: "active" },
  { id: "deel", name: "Deel", category: "Contractors", owner: "Ana Silva", quarter: 14400, change: 6, monthly: [5, 5.5, 5.5, 6, 6, 6.5, 6.5, 7, 7, 7.2, 7.2, 0], terms: "ACH, monthly", contract: "Rolling", since: "2023", status: "active" },
  { id: "metaads", name: "Meta Ads", category: "Marketing", owner: "Priya Raman", quarter: 9800, change: 22, monthly: [3, 3, 4, 3, 4, 4, 5, 4, 5, 5, 6, 2], terms: "Card, as billed", contract: "No contract", since: "2024", status: "new" },
  { id: "slack", name: "Slack", category: "Software", owner: "Ana Silva", quarter: 4200, change: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4.2], terms: "Card, annual", contract: "Renews Nov 7", since: "2020", status: "active" },
  { id: "openai", name: "OpenAI", category: "Software", owner: "Leo Park", quarter: 1860, change: 34, monthly: [.2, .2, .3, .3, .4, .4, .5, .5, .5, .6, .6, .6], terms: "Card, usage", contract: "No contract", since: "2024", status: "new" },
];

export const vendorCategories = ["All", ...Array.from(new Set(vendorRecords.map(vendor => vendor.category)))];
export const monthLabels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

/* Subscriptions. `price` is per seat per month (or the flat monthly price when seats is 0). `in` is days until renewal. */
export interface Subscription {
  id: string; name: string; plan: string; seats: number; used: number; price: number; cycle: "Monthly" | "Annual";
  in: number; date: string; owner: string; category: string; autoRenew: boolean;
}

export const subscriptions: Subscription[] = [
  { id: "slack", name: "Slack", plan: "Business+", seats: 48, used: 46, price: 7.29, cycle: "Annual", in: 3, date: "Nov 7", owner: "Ana Silva", category: "Communication", autoRenew: true },
  { id: "notion", name: "Notion", plan: "Plus", seats: 40, used: 31, price: 4, cycle: "Annual", in: 9, date: "Nov 13", owner: "Ana Silva", category: "Docs", autoRenew: true },
  { id: "linear", name: "Linear", plan: "Business", seats: 28, used: 27, price: 6, cycle: "Monthly", in: 14, date: "Nov 18", owner: "Leo Park", category: "Engineering", autoRenew: true },
  { id: "github", name: "GitHub", plan: "Team", seats: 31, used: 29, price: 4, cycle: "Monthly", in: 17, date: "Nov 21", owner: "Leo Park", category: "Engineering", autoRenew: true },
  { id: "figma", name: "Figma", plan: "Organization", seats: 24, used: 13, price: 37.5, cycle: "Annual", in: 28, date: "Dec 2", owner: "Maya Chen", category: "Design", autoRenew: true },
  { id: "loom", name: "Loom", plan: "Business", seats: 16, used: 14, price: 12.5, cycle: "Annual", in: 41, date: "Dec 15", owner: "Maya Chen", category: "Communication", autoRenew: true },
  { id: "vimeo", name: "Vimeo", plan: "Pro", seats: 4, used: 1, price: 20, cycle: "Annual", in: 47, date: "Dec 21", owner: "Maya Chen", category: "Communication", autoRenew: true },
  { id: "zoom", name: "Zoom", plan: "Business", seats: 20, used: 12, price: 18.32, cycle: "Annual", in: 58, date: "Jan 1", owner: "Ana Silva", category: "Communication", autoRenew: true },
  { id: "1password", name: "1Password", plan: "Business", seats: 52, used: 50, price: 7.99, cycle: "Annual", in: 66, date: "Jan 9", owner: "Leo Park", category: "Security", autoRenew: true },
  { id: "hubspot", name: "HubSpot", plan: "Sales Pro", seats: 8, used: 7, price: 90, cycle: "Annual", in: 79, date: "Jan 22", owner: "Sam Okafor", category: "Sales", autoRenew: true },
];

/* Budgets for Q4, with weekly spend for the 13 weeks of the quarter (thousands; weeks after this one are a forecast). */
export const quarterWeek = 4;
export const quarterDaysLeft = 57;
export interface BudgetRecord { id: string; name: string; owner: string; spent: number; budget: number; weekly: number[]; top: { vendor: string; amount: number }[] }
export const budgetRecords: BudgetRecord[] = [
  { id: "cloud", name: "Cloud & infrastructure", owner: "Leo Park", spent: 84600, budget: 168000, weekly: [15, 16, 17, 18, 18.6, 17, 17, 17, 16, 16, 16, 15, 15], top: [{ vendor: "AWS", amount: 61200 }, { vendor: "Datadog", amount: 15400 }, { vendor: "Vercel", amount: 8000 }] },
  { id: "marketing", name: "Marketing", owner: "Priya Raman", spent: 62400, budget: 150000, weekly: [11, 12, 13, 12.4, 14, 12, 12, 11, 11, 10, 10, 9, 9], top: [{ vendor: "Google Ads", amount: 31200 }, { vendor: "Meta Ads", amount: 9800 }, { vendor: "Offsite deposit", amount: 6250 }] },
  { id: "software", name: "Software", owner: "Maya Chen", spent: 48900, budget: 132000, weekly: [9, 10, 9.5, 10, 10.4, 10, 10, 10, 10, 10, 10, 10, 10], top: [{ vendor: "Figma", amount: 10800 }, { vendor: "Slack", amount: 4200 }, { vendor: "Notion", amount: 1920 }] },
  { id: "office", name: "Office", owner: "Ana Silva", spent: 41200, budget: 126000, weekly: [8, 8.2, 8.4, 8.2, 8.4, 9, 9, 9, 9, 10, 10, 10, 10], top: [{ vendor: "WeWork", amount: 47000 }, { vendor: "Staples", amount: 1200 }] },
  { id: "contractors", name: "Contractors", owner: "Ana Silva", spent: 31000, budget: 108000, weekly: [6, 6, 6.5, 6, 6.5, 8, 8, 8, 8, 9, 9, 9, 9], top: [{ vendor: "Deel", amount: 14400 }, { vendor: "Upwork", amount: 4800 }] },
  { id: "travel", name: "Travel & meals", owner: "Sam Okafor", spent: 24500, budget: 60000, weekly: [4.5, 5, 5, 5, 5, 4, 4, 4, 3.5, 3.5, 3.5, 3, 3], top: [{ vendor: "Delta", amount: 14600 }, { vendor: "Marriott", amount: 2400 }, { vendor: "Uber", amount: 1900 }] },
];
