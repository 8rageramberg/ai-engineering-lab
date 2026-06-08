import type { DailyActivity } from "@/lib/api";

// Trailing window shown, in days -- 13 full weeks gives a clean rectangular grid
// regardless of how much history exists yet (this project is brand new).
const WINDOW_DAYS = 13 * 7;

// Intensity buckets mapped to the existing sage/olive accent tokens at rising opacity --
// no new color scale, just shades of accent-primary plus the neutral surface tones already
// used elsewhere for "no activity". A heavy session should look visibly different from a
// light one without introducing a separate palette.
const LEVEL_CLASSES = [
  "bg-text-secondary/10",
  "bg-accent-primary/25",
  "bg-accent-primary/50",
  "bg-accent-primary/75",
  "bg-accent-primary",
];

function levelFor(tokens: number, max: number) {
  if (tokens <= 0 || max <= 0) return 0;
  const ratio = tokens / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildWeeks(activityByDate: Map<string, number>) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));
  // Roll back to the preceding Sunday so every column is a full Sun–Sat week.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const days: { date: string; tokens: number }[] = [];
  for (const cursor = new Date(start); cursor <= today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = dateKey(cursor);
    days.push({ date: key, tokens: activityByDate.get(key) ?? 0 });
  }

  const weeks: { date: string; tokens: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function ActivityCalendar({ days }: { days: DailyActivity[] }) {
  const activityByDate = new Map(days.map((day) => [day.date, day.tokens]));
  const weeks = buildWeeks(activityByDate);
  const max = Math.max(0, ...days.map((day) => day.tokens));

  return (
    <section className="mt-16">
      <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
        Activity calendar
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
        Daily token usage, at a glance
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        One box per day, shaded by tokens spent that day rather than commit count — a heavy
        session should look visibly different from a light one.
      </p>

      <div className="mt-6 flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week) => (
          <div key={week[0].date} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date} — ${day.tokens.toLocaleString()} tokens`}
                className={`h-3 w-3 rounded-sm ${LEVEL_CLASSES[levelFor(day.tokens, max)]}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary">
        <span>Less</span>
        {LEVEL_CLASSES.map((className) => (
          <span key={className} className={`h-3 w-3 rounded-sm ${className}`} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
