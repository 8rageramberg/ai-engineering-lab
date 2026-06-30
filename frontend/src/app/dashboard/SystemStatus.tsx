"use client";

import { useEffect, useState } from "react";
import {
  getSystemStatus,
  getTelemetrySummary,
  type SystemStatus as SystemStatusData,
  type TelemetrySummary,
} from "@/lib/api";

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

function StatusBadge({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        healthy ? "bg-accent-primary/15 text-accent-secondary" : "bg-accent-alert/15 text-accent-alert"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-accent-primary animate-pulse" : "bg-accent-alert"}`}
        aria-hidden
      />
      {healthy ? "healthy" : "down"}
    </span>
  );
}

interface PipelineNodeProps {
  title: string;
  label: string;
  description?: string;
  status?: "healthy" | "down" | null;
  detail?: string;
  stats?: Array<{ label: string; value: string }>;
  isLocal?: boolean;
}

function PipelineNode({
  title,
  label,
  description,
  status,
  detail,
  stats,
  isLocal,
}: PipelineNodeProps) {
  const hasStatus = status !== null && status !== undefined;
  const isHealthy = status === "healthy";

  return (
    <div className="rounded-xl border border-text-secondary/15 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{label}</p>
          {description && <p className="mt-2 text-xs text-text-secondary">{description}</p>}
        </div>
        {hasStatus && <StatusBadge healthy={isHealthy} />}
      </div>

      {detail && <p className="mt-2 text-xs text-text-secondary">{detail}</p>}

      {stats && stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-text-secondary">{stat.label}</dt>
              <dd className="font-medium text-text-primary">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ArrowConnection({ label }: { label: string }) {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <div className="w-12 border-t border-text-secondary/20" />
      <div className="text-center text-xs text-text-secondary/60">
        <div>{label}</div>
      </div>
    </div>
  );
}

export function SystemStatus() {
  const [systemData, setSystemData] = useState<SystemStatusData | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetrySummary | null>(null);
  const [lastError, setLastError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [system, telemetry] = await Promise.all([
          getSystemStatus(),
          getTelemetrySummary().catch(() => null),
        ]);
        if (!cancelled) {
          setSystemData(system);
          setTelemetryData(telemetry);
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

  const frontendService = systemData?.services.find((s) => s.name === "frontend");
  const backendService = systemData?.services.find((s) => s.name === "backend");
  const databaseService = systemData?.services.find((s) => s.name === "database");

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
          {systemData
            ? `updated ${new Date(systemData.checked_at).toLocaleTimeString()}`
            : lastError
              ? "unreachable"
              : "loading…"}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Every node in this pipeline is either live or local. The three right-hand nodes report
        their health in real time — polled every {POLL_INTERVAL_MS / 1000} seconds from the backend, no streaming
        infrastructure involved.
      </p>

      {/* Aggregate stats bar */}
      {telemetryData && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-text-secondary/15 bg-surface p-3">
            <p className="text-xs text-text-secondary">{telemetryData.commit_count} commits pushed</p>
            <p className="mt-1 text-xl font-semibold text-accent-primary">{telemetryData.commit_count}</p>
          </div>
          <div className="rounded-lg border border-text-secondary/15 bg-surface p-3">
            <p className="text-xs text-text-secondary">{telemetryData.session_count} AI sessions logged</p>
            <p className="mt-1 text-xl font-semibold text-accent-primary">{telemetryData.session_count}</p>
          </div>
          <div className="rounded-lg border border-text-secondary/15 bg-surface p-3">
            <p className="text-xs text-text-secondary">{telemetryData.total_prompt_count} prompts sent</p>
            <p className="mt-1 text-xl font-semibold text-accent-primary">
              {telemetryData.total_prompt_count}
            </p>
          </div>
          <div className="rounded-lg border border-text-secondary/15 bg-surface p-3">
            <p className="text-xs text-text-secondary">
              built over {telemetryData.total_dev_hours_estimate.toFixed(1)}h
            </p>
            <p className="mt-1 text-xl font-semibold text-accent-primary">
              {telemetryData.total_dev_hours_estimate.toFixed(1)}h
            </p>
          </div>
        </div>
      )}

      {/* Architecture pipeline */}
      <div className="mt-12 space-y-8 lg:space-y-0">
        {/* Row 1: Local Layer and Source Control */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          {/* Column 1: Local Layer */}
          <div className="space-y-3 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Local layer</p>
            <div className="space-y-3">
              <PipelineNode
                title="Claude Code"
                label="Local dev"
                description="AI coding assistant in editor"
                isLocal
                stats={
                  telemetryData ? [{ label: "Prompts", value: `${telemetryData.total_prompt_count}` }] : undefined
                }
              />
              <PipelineNode
                title="Git hooks"
                label="Local tooling"
                description="Post-commit telemetry + pre-push validation"
                isLocal
                stats={
                  telemetryData ? [{ label: "Sessions", value: `${telemetryData.session_count}` }] : undefined
                }
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex items-center gap-2">
              <div className="w-12 border-t border-text-secondary/20" />
              <span className="text-center text-xs text-text-secondary/60">prompts → logs</span>
            </div>
          </div>

          {/* Column 2: Source Control */}
          <div className="lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Source control</p>
            <div className="mt-3">
              <PipelineNode
                title="GitHub"
                label="Version control"
                description="Source of truth"
                stats={
                  telemetryData ? [{ label: "Commits", value: `${telemetryData.commit_count}` }] : undefined
                }
              />
              <p className="mt-2 text-xs text-text-secondary/60">
                Every push triggers Vercel + Render deploys
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex items-center gap-2">
              <div className="w-12 border-t border-text-secondary/20" />
              <span className="text-center text-xs text-text-secondary/60">auto-deploy</span>
            </div>
          </div>

          {/* Column 3: Hosting */}
          <div className="space-y-3 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Hosting</p>
            <div className="space-y-3">
              <PipelineNode
                title="Vercel"
                label="Frontend"
                description="Next.js on Vercel CDN"
                status={frontendService?.status === "up" ? "healthy" : "down"}
                detail={frontendService?.detail}
              />
              <PipelineNode
                title="Render + Docker"
                label="Backend"
                description="FastAPI in container"
                status={backendService?.status === "up" ? "healthy" : "down"}
                detail={backendService?.detail}
                stats={
                  backendService?.container?.uptime_seconds
                    ? [{ label: "Uptime", value: formatUptime(backendService.container.uptime_seconds) }]
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Row 2: Data layer connection */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="lg:w-1/4" />

          {/* Arrow from Git hooks to Database */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 border-l border-text-secondary/20" />
              <span className="text-center text-xs text-text-secondary/60">direct psql</span>
              <div className="h-8 border-l border-text-secondary/20" />
            </div>
          </div>

          <div className="lg:w-1/4" />

          {/* Arrow from Backend to Database */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex items-center gap-2">
              <div className="w-12 border-t border-text-secondary/20" />
              <span className="text-center text-xs text-text-secondary/60">r/w events</span>
            </div>
          </div>

          {/* Column 4: Data */}
          <div className="lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Data</p>
            <div className="mt-3">
              <PipelineNode
                title="Neon"
                label="Database"
                description="Serverless Postgres"
                status={databaseService?.status === "up" ? "healthy" : "down"}
                detail={databaseService?.detail}
                stats={
                  telemetryData ? [{ label: "Sessions", value: `${telemetryData.session_count}` }] : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      {!systemData && !lastError && (
        <div className="mt-8 rounded-xl border border-dashed border-text-secondary/30 bg-surface p-8 text-center text-sm text-text-secondary">
          Checking service health…
        </div>
      )}
      {!systemData && lastError && (
        <div className="mt-8 rounded-xl border border-dashed border-accent-alert/40 bg-surface p-8 text-center text-sm text-accent-alert">
          Couldn&apos;t reach the system-status API — make sure the backend is running.
        </div>
      )}
    </section>
  );
}
