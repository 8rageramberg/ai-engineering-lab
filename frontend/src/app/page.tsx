import { getHealth } from "@/lib/api";

export default async function Home() {
  const health = await getHealth().catch(() => null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
          AI engineering portfolio
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Built in the open, measured as it goes.
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600">
          This is an AI engineering portfolio that demonstrates clean telemetry, cost-aware
          AI usage, and a small full-stack app — all assembled by coding agents while the
          project records structured evidence of how the work actually happened: every
          session, every token, every dollar.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <a
            href="/dashboard"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            View the telemetry dashboard
          </a>
          <span className="flex items-center gap-2 text-sm text-zinc-500">
            <span
              className={`h-2 w-2 rounded-full ${health ? "bg-emerald-500" : "bg-red-500"}`}
              aria-hidden
            />
            backend {health ? "online" : "unreachable"}
          </span>
        </div>
      </div>
    </div>
  );
}
