import { getTelemetrySummary, getDailyActivity } from "@/lib/api";
import { SystemStatus } from "./SystemStatus";
import { ActivityCalendar } from "./ActivityCalendar";

// Grep of all frontend/src/app/**/*.tsx files for "—" excluding loading-state
// placeholders (return "—", value: "—") and code/comment lines.
// Update when copy changes: grep -rn "—" src/app --include="*.tsx" | grep -v 'return "—"' | grep -v ': "—"' | grep -v "//\|/\*\|match\|title={"
const SITE_EM_DASH_COUNT = 36;

const numberFormatter = new Intl.NumberFormat("en-US");
const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const hoursFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function Dashboard() {
  const [summary, dailyActivity] = await Promise.all([
    getTelemetrySummary().catch(() => null),
    getDailyActivity().catch(() => []),
  ]);

  const supportingStats = summary
    ? [
        {
          label: "Tokens spent building this",
          value: numberFormatter.format(summary.total_tokens),
          hint: "input + output + cache-write tokens — cache-read tokens excluded from this count (they re-read prior context, not new work), but their cost is included below",
        },
        {
          label: "Estimated cost (Claude list-rate pricing)",
          value: costFormatter.format(summary.total_cost_usd),
          hint: "input at $3/MTok, output at $15/MTok, cache-write at $3.75/MTok, cache-read at $0.30/MTok — not an invoice, and sessions before 2026-06-30 are missing cache-read cost (see audit log)",
        },
        {
          label: "Coding sessions logged",
          value: numberFormatter.format(summary.session_count),
          hint: `landed as ${numberFormatter.format(summary.commit_count)} commits — sessions can outnumber commits when one is purely exploratory and produces no commit`,
        },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
          Telemetry dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Here&apos;s what it has cost, in tokens and dollars, to build this project.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          Every coding session is logged as a structured event the moment it lands as a
          commit — no hand-typed numbers, no guesswork. These figures are aggregated live
          from the same{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-sm text-text-primary">events</code>{" "}
          table the rest of this platform runs on.
        </p>

        {summary ? (
          <>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">
                  Prompts sent to build this
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-accent-primary">
                  {numberFormatter.format(summary.total_prompt_count)}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  summed straight from each session&apos;s prompt counter — every
                  back-and-forth that went into building this, no estimation
                </p>
              </div>

              <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">
                  Hours of AI-assisted development
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-accent-primary">
                  ≈ {hoursFormatter.format(summary.total_dev_hours_estimate)}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  an approximation: {hoursFormatter.format(summary.tracked_dev_hours)}h is
                  measured precisely (commit time minus session-start time, summed per
                  session) — tracking began on day two. The other{" "}
                  {hoursFormatter.format(
                    summary.total_dev_hours_estimate - summary.tracked_dev_hours
                  )}
                  h is a one-time hand-estimate covering day-one sessions logged before
                  that measurement existed. The estimate&apos;s share shrinks on its own as
                  more precisely-tracked hours stack on top of it.
                </p>
              </div>

              <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">
                  Em dashes in this site&apos;s copy
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-accent-primary">
                  {SITE_EM_DASH_COUNT}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  a known AI writing tell — counted across all pages from the source
                  files, not from the live DOM
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {supportingStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-text-secondary/15 bg-surface p-6 shadow-sm"
                >
                  <dt className="text-sm font-medium text-text-secondary">{stat.label}</dt>
                  <dd className="mt-2 text-3xl font-semibold tracking-tight text-accent-primary">
                    {stat.value}
                  </dd>
                  <p className="mt-2 text-xs text-text-secondary">{stat.hint}</p>
                </div>
              ))}
            </dl>

            <ActivityCalendar days={dailyActivity} />
          </>
        ) : (
          <div className="mt-12 rounded-xl border border-dashed border-text-secondary/30 bg-surface p-8 text-center text-sm text-text-secondary">
            Couldn&apos;t reach the telemetry API — make sure the backend is running and the
            database has been seeded.
          </div>
        )}

        <SystemStatus />
      </div>
    </div>
  );
}

