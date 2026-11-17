export type RangeId = "today" | "yesterday" | "7d" | "30d";
export type SeriesKey = "people" | "views";

export type Point = { key: string; label: string; people: number; views: number };
export type Referral = { index: number; source: "google" | "x" | "github"; people: number };
export type Row = { label: string; value: number };

export type RangeData = {
  /** Every slot on the axis. Slots after `now` are in the future and stay empty. */
  points: Point[];
  /** Index of the latest slot with data. */
  now: number;
  /** Shown under the axis at both ends. */
  edges: [string, string];
  /** Label of the "now" pill. Empty when the range is closed. */
  nowLabel: string;
  referral: Referral | null;
  stats: { people: number; views: number; bounced: number; duration: number };
  changes: { people: string; views: string; bounced: string; duration: string };
  score: number;
  pages: Row[];
  sources: Row[];
};

export const ranges: { value: RangeId; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

/** A small seeded generator, so the first render is identical every time. */
function seeded(seed: number) {
  let state = seed;
  return () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; };
}

const hour = (index: number) => `${String(index).padStart(2, "0")}:00`;
const hours = (people: number[], views: number[]): Point[] =>
  Array.from({ length: 24 }, (_, index) => ({ key: hour(index), label: hour(index), people: people[index] ?? 0, views: views[index] ?? 0 }));

function days(count: number, seed: number, base: number): Point[] {
  const random = seeded(seed);
  const end = new Date(Date.UTC(2026, 9, 27));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end.getTime() - (count - 1 - index) * 86_400_000);
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? .62 : 1;
    const people = Math.round(base * weekend * (.75 + random() * .5) * (1 + index / count / 2));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      people,
      views: Math.round(people * (1.3 + random() * .4)),
    };
  });
}

const shortDay = (point: Point) => point.label.split(", ")[1] ?? point.label;

const week = days(7, 7, 38);
const month = days(30, 30, 34);

export const dataByRange: Record<RangeId, RangeData> = {
  today: {
    points: hours([0, 0, 0, 1, 2, 0, 0, 1, 1, 0, 0], [0, 0, 0, 1, 2, 0, 0, 1, 1, 0, 0]),
    now: 10,
    edges: ["00:00", "23:00"],
    nowLabel: "10:00",
    referral: { index: 4, source: "google", people: 2 },
    stats: { people: 4, views: 5, bounced: 100, duration: 0 },
    changes: { people: "+100%", views: "+150%", bounced: "0%", duration: "0%" },
    score: 94,
    pages: [{ label: "/", value: 3 }, { label: "/pricing", value: 1 }, { label: "/blog/motion", value: 1 }],
    sources: [{ label: "Google", value: 2 }, { label: "Direct", value: 2 }],
  },
  yesterday: {
    points: hours(
      [0, 0, 1, 0, 0, 1, 2, 4, 6, 7, 5, 4, 6, 8, 7, 5, 4, 3, 2, 3, 2, 1, 1, 0],
      [0, 0, 1, 0, 0, 2, 3, 6, 9, 11, 8, 6, 9, 12, 10, 7, 6, 4, 3, 4, 3, 1, 1, 0],
    ),
    now: 23,
    edges: ["00:00", "23:00"],
    nowLabel: "",
    referral: { index: 13, source: "x", people: 6 },
    stats: { people: 64, views: 106, bounced: 50, duration: 74 },
    changes: { people: "-12%", views: "+4%", bounced: "-8%", duration: "+21%" },
    score: 88,
    pages: [{ label: "/", value: 52 }, { label: "/pricing", value: 27 }, { label: "/docs/install", value: 16 }, { label: "/blog/motion", value: 11 }],
    sources: [{ label: "X", value: 24 }, { label: "Google", value: 20 }, { label: "Direct", value: 14 }, { label: "GitHub", value: 6 }],
  },
  "7d": {
    points: week,
    now: week.length - 1,
    edges: [shortDay(week[0]!), shortDay(week[week.length - 1]!)],
    nowLabel: "",
    referral: { index: 3, source: "github", people: 21 },
    stats: { people: week.reduce((sum, point) => sum + point.people, 0), views: week.reduce((sum, point) => sum + point.views, 0), bounced: 46, duration: 132 },
    changes: { people: "+18%", views: "+24%", bounced: "-6%", duration: "+9%" },
    score: 91,
    pages: [{ label: "/", value: 213 }, { label: "/pricing", value: 103 }, { label: "/docs/install", value: 75 }, { label: "/blog/motion", value: 47 }],
    sources: [{ label: "Google", value: 112 }, { label: "GitHub", value: 75 }, { label: "Direct", value: 59 }, { label: "X", value: 32 }],
  },
  "30d": {
    points: month,
    now: month.length - 1,
    edges: [shortDay(month[0]!), shortDay(month[month.length - 1]!)],
    nowLabel: "",
    referral: { index: 11, source: "google", people: 58 },
    stats: { people: month.reduce((sum, point) => sum + point.people, 0), views: month.reduce((sum, point) => sum + point.views, 0), bounced: 49, duration: 118 },
    changes: { people: "+32%", views: "+27%", bounced: "-3%", duration: "+14%" },
    score: 90,
    pages: [{ label: "/", value: 852 }, { label: "/pricing", value: 395 }, { label: "/docs/install", value: 288 }, { label: "/blog/motion", value: 180 }],
    sources: [{ label: "Google", value: 479 }, { label: "Direct", value: 278 }, { label: "GitHub", value: 238 }, { label: "X", value: 132 }],
  },
};

export const sites = [
  { value: "ledger", label: "Ledger", meta: "ledger.money" },
  { value: "fieldnotes", label: "Fieldnotes", meta: "fieldnotes.app" },
  { value: "parcel", label: "Parcel", meta: "parcel.studio" },
];

/** Visitors the live card cycles through once the page is open. */
export const liveVisitors = [
  { page: "/", place: "Berlin", flag: "🇩🇪" },
  { page: "/pricing", place: "Toronto", flag: "🇨🇦" },
  { page: "/blog/motion", place: "Lisbon", flag: "🇵🇹" },
  { page: "/", place: "Tokyo", flag: "🇯🇵" },
  { page: "/docs/install", place: "Austin", flag: "🇺🇸" },
  { page: "/pricing", place: "Istanbul", flag: "🇹🇷" },
];
