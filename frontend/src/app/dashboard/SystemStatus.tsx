"use client";

import { useEffect, useState } from "react";

import { getSystemStatus, type SystemStatus as SystemStatusData } from "@/lib/api";

const POLL_INTERVAL_MS = 5_000;

function formatUptime(seconds: number | null) {
  if (seconds === null) return "—";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "—";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

const SERVICE_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
};

export function SystemStatus() {
  const [data, setData] = useState<SystemStatusData | null>(null);
  const [lastError, setLastError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const status = await getSystemStatus();
        if (!cancelled) {
          setData(status);
          setLastError(false);
        }
      } catch {
        if (!cancelled) setLastError(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="mt-16">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
            Live system status
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            Is it alive right now, and how is it doing?
          </h2>
        </div>
        <p className="text-xs text-text-secondary">
          {data
            ? `updated ${new Date(data.checked_at).toLocaleTimeString()}`
            : lastError
              ? "unreachable"
              : "loading…"}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Polled every {POLL_INTERVAL_MS / 1000} seconds straight from the backend — service
        reachability, process uptime, and per-container CPU/memory, no streaming infra involved.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(data?.services ?? []).map((service) => {
          const healthy = service.status === "up";
          return (
            <div
              key={service.name}
              className="rounded-xl border border-text-secondary/15 bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">
                  {SERVICE_LABELS[service.name] ?? service.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    healthy
                      ? "bg-accent-primary/15 text-accent-secondary"
                      : "bg-accent-alert/15 text-accent-alert"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-accent-primary" : "bg-accent-alert"}`}
                    aria-hidden
                  />
                  {healthy ? "healthy" : "down"}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{service.detail}</p>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-text-secondary">Uptime</dt>
                <dd className="text-right font-medium text-text-primary">
                  {formatUptime(service.container?.uptime_seconds ?? null)}
                </dd>
                <dt className="text-text-secondary">CPU</dt>
                <dd className="text-right font-medium text-text-primary">
                  {formatPercent(service.container?.cpu_percent ?? null)}
                </dd>
                <dt className="text-text-secondary">Memory</dt>
                <dd className="text-right font-medium text-text-primary">
                  {formatBytes(service.container?.memory_used_bytes ?? null)}
                  <span className="text-text-secondary">
                    {" "}
                    ({formatPercent(service.container?.memory_percent ?? null)})
                  </span>
                </dd>
              </dl>
            </div>
          );
        })}

        {!data && !lastError && (
          <div className="col-span-full rounded-xl border border-dashed border-text-secondary/30 bg-surface p-8 text-center text-sm text-text-secondary">
            Checking service health…
          </div>
        )}
        {!data && lastError && (
          <div className="col-span-full rounded-xl border border-dashed border-accent-alert/40 bg-surface p-8 text-center text-sm text-accent-alert">
            Couldn&apos;t reach the system-status API — make sure the backend is running.
          </div>
        )}
      </div>
    </section>
  );
}
