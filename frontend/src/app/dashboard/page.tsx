import { getTelemetrySummary } from "@/lib/api";

const numberFormatter = new Intl.NumberFormat("en-US");
const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function Dashboard() {
  const summary = await getTelemetrySummary().catch(() => null);

  const stats = summary
    ? [
        {
          label: "Tokens spent building this",
          value: numberFormatter.format(summary.total_tokens),
          hint: "input + output + cache-write tokens across every logged session",
        },
        {
          label: "Estimated cost so far",
          value: costFormatter.format(summary.total_cost_usd),
          hint: "priced per-category at current Claude list rates",
        },
        {
          label: "Coding sessions logged",
          value: numberFormatter.format(summary.session_count),
          hint: "every Claude Code / Codex session that touched this repo",
        },
        {
          label: "Commits shipped",
          value: numberFormatter.format(summary.commit_count),
          hint: "distinct commits with an attached telemetry event",
        },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
          Telemetry dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Here&apos;s what it has cost, in tokens and dollars, to build this project.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
          Every coding session is logged as a structured event the moment it lands as a
          commit — no hand-typed numbers, no guesswork. These figures are aggregated live
          from the same <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">events</code> table
          the rest of this platform runs on.
        </p>

        {summary ? (
          <dl className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <dt className="text-sm font-medium text-zinc-500">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                  {stat.value}
                </dd>
                <p className="mt-2 text-xs text-zinc-400">{stat.hint}</p>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-12 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Couldn&apos;t reach the telemetry API — make sure the backend is running and the
            database has been seeded.
          </div>
        )}
      </div>
    </div>
  );
}
