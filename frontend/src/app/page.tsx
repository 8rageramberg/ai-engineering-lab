import { getHealth } from "@/lib/api";

export default async function Home() {
  const health = await getHealth().catch(() => null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
          AI engineering portfolio
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          Built with AI agents, measured as it went.
        </h1>
        <p className="mt-6 text-lg leading-8 text-text-secondary">
          Hi. I built this to figure out how fast you can move with coding agents and to have
          something real to show for it. Starting from a blank repo: a FastAPI backend, a Next.js
          frontend, a Neon Postgres database, git hooks that log every session as structured
          telemetry, and a dashboard showing exactly what it cost in tokens and dollars.
        </p>
        <p className="mt-4 text-base leading-7 text-text-secondary">
          Zero to live-hosted in under 15 hours. Not every number is perfectly precise — there is
          an audit log explaining where the gaps are — but the methodology is sound, the code is
          real, and the site is running right now.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="/dashboard"
            className="rounded-md bg-accent-secondary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-primary"
          >
            View the telemetry dashboard
          </a>
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <span
              className={`h-2 w-2 rounded-full ${health ? "bg-accent-primary" : "bg-text-secondary/40"}`}
              aria-hidden
            />
            backend {health ? "online" : "sleeping (Render free tier)"}
          </span>
        </div>
      </div>
    </div>
  );
}
