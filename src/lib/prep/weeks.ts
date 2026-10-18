// src/lib/prep/weeks.ts
// Ordering weeks, in the viewer's local time.
// Hungry House: orders Monday 12:00am – Sunday 11:59pm, delivered the next day (Monday).

export interface WeekSettings {
  /** Day the ordering window opens (0 = Sunday, 1 = Monday …). */
  startsOn: number;
  /** Days the window stays open, counting the first day (Mon–Sun = 7; less leaves a gap). */
  days: number;
  /** Delivery day, counted in days after the window's last day (Sun -> Mon = 1). */
  deliveryDaysAfterEnd: number;
}

export interface OrderWeek {
  start: string; // YYYY-MM-DD, first day orders count
  end: string; // YYYY-MM-DD, last day orders count (inclusive)
  label: string; // "Oct 12 – 18"
  deliveryLabel: string; // "Mon, Oct 19"
  deliveryDate: string; // YYYY-MM-DD
  /** Days between the previous window and this one (e.g. the Sunday before), if any. */
  gapBefore?: { from: string; to: string; label: string };
  /** Orders are still coming in. */
  isOpen: boolean;
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** The most recent `count` ordering windows, newest first. */
export function orderWeeks(today: Date, s: WeekSettings, count = 6): OrderWeek[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const base = addDays(t, -((t.getDay() - s.startsOn + 7) % 7)); // latest window start on or before today

  const weeks: OrderWeek[] = [];
  for (let i = 0; i < count; i++) {
    const start = addDays(base, -7 * i);
    const end = addDays(start, s.days - 1);
    const delivery = addDays(end, s.deliveryDaysAfterEnd);
    const gapDays = 7 - s.days;
    const sameMonth = start.getMonth() === end.getMonth();
    weeks.push({
      start: ymd(start),
      end: ymd(end),
      label: `${short(start)} – ${sameMonth ? end.getDate() : short(end)}`,
      deliveryLabel: delivery.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      deliveryDate: ymd(delivery),
      gapBefore:
        gapDays > 0
          ? {
              from: ymd(addDays(start, -gapDays)),
              to: ymd(addDays(start, -1)),
              label: addDays(start, -1).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
            }
          : undefined,
      isOpen: t <= end,
    });
  }
  return weeks;
}

/** The week being prepped next: the oldest week whose delivery day is today or later. */
export function defaultWeek(weeks: OrderWeek[], today: Date): OrderWeek {
  const t = ymd(today);
  return [...weeks].reverse().find((w) => w.deliveryDate >= t) || weeks[0];
}
