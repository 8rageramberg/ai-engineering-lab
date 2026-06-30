import { getTelemetrySummary, getDailyActivity, getDeploys, type DeployEvent } from "@/lib/api";
import { SystemStatus } from "./SystemStatus";
import { ActivityCalendar } from "./ActivityCalendar";

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
  const [summary, dailyActivity, deploys] = await Promise.all([
    getTelemetrySummary().catch(() => null),
    getDailyActivity().catch(() => []),
    getDeploys().catch(() => null),
  ]);

  const supportingStats = summary
    ? [
        {
          label: "Tokens spent building this",
          value: numberFormatter.format(summary.total_tokens),
          hint: "input + output + cache-write tokens across every logged session",
        },
        {
          label: "Estimated cost (Claude list-rate pricing)",
          value: costFormatter.format(summary.total_cost_usd),
          hint: "priced per-category at current Claude list rates — not an actual invoice",
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
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <RecentDeploys deploys={deploys} />
        <SystemStatus />
      </div>
    </div>
  );
}

function RecentDeploys({ deploys }: { deploys: Awaited<ReturnType<typeof getDeploys>> | null }) {
  return (
    <section className="mt-16">
      <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
        Deploy history
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
        What shipped, and when.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Every successful GitHub Actions run emits a{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs text-text-primary font-mono">
          commit_pushed
        </code>{" "}
        event to the same{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs text-text-primary font-mono">
          events
        </code>{" "}
        table. These rows appear here the moment CI finishes.
      </p>

      {deploys && deploys.total_deploys > 0 ? (
        <>
          {/* Frequency stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: "Total deploys", value: deploys.total_deploys },
              { label: "Last 7 days", value: deploys.deploys_last_7_days },
              { label: "Last 24 hours", value: deploys.deploys_last_24h },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-text-secondary/15 bg-surface p-5 shadow-sm"
              >
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-accent-primary">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent deploy list */}
          <div className="mt-4 rounded-xl border border-text-secondary/15 bg-surface shadow-sm">
            <ul className="divide-y divide-text-secondary/10">
              {deploys.recent.map((d: DeployEvent) => (
                <li key={d.id} className="flex items-start gap-4 px-5 py-4">
                  <code className="mt-0.5 shrink-0 rounded bg-background px-1.5 py-0.5 text-xs font-mono text-text-secondary">
                    {d.commit_sha ?? "—"}
                  </code>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {d.commit_message ?? "no message"}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {d.branch ?? "main"}{d.actor ? ` · ${d.actor}` : ""}
                      {" · "}
                      {new Date(d.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-text-secondary/30 bg-surface p-8 text-center text-sm text-text-secondary">
          {deploys === null
            ? "Couldn't reach the deploys API — make sure the backend is running."
            : "No deploys recorded yet. GitHub Actions will populate this after the first successful CI run."}
        </div>
      )}
    </section>
  );
}
