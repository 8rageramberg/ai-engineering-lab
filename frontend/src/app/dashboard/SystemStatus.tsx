"use client";

import { useEffect, useRef, useState } from "react";
import {
  getSystemStatus,
  getTelemetrySummary,
  type SystemStatus as SystemStatusData,
  type TelemetrySummary,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5_000;
const BACKEND_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://ai-engineering-lab-azzp.onrender.com")
    : "";

type NodeStatus = "healthy" | "down" | "sleeping" | null;
type BootPhase = "idle" | "booting" | "awake";

function formatUptime(seconds: number | null) {
  if (seconds === null) return "—";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}

function StatusBadge({ status }: { status: NodeStatus }) {
  if (!status) return null;

  const configs: Record<Exclude<NodeStatus, null>, { pill: string; dot: string; label: string }> = {
    healthy: {
      pill: "bg-accent-primary/15 text-accent-secondary",
      dot: "bg-accent-primary animate-pulse",
      label: "healthy",
    },
    down: {
      pill: "bg-accent-alert/15 text-accent-alert",
      dot: "bg-accent-alert",
      label: "down",
    },
    sleeping: {
      pill: "bg-text-secondary/10 text-text-secondary",
      dot: "bg-text-secondary/40 animate-pulse",
      label: "sleeping",
    },
  };

  const c = configs[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {c.label}
    </span>
  );
}

interface PipelineNodeProps {
  title: string;
  label: string;
  description?: string;
  status?: NodeStatus;
  detail?: string;
  stats?: Array<{ label: string; value: string }>;
}

function PipelineNode({ title, label, description, status, detail, stats }: PipelineNodeProps) {
  const isSleeping = status === "sleeping";

  return (
    <div
      className={`rounded-xl border bg-surface p-4 shadow-sm transition-opacity duration-500 ${
        isSleeping
          ? "border-text-secondary/10 opacity-40"
          : "border-text-secondary/15"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{label}</p>
          {description && (
            <p className="mt-2 text-xs text-text-secondary">{description}</p>
          )}
        </div>
        {status !== null && status !== undefined && <StatusBadge status={status} />}
      </div>

      {detail && !isSleeping && (
        <p className="mt-2 text-xs text-text-secondary">{detail}</p>
      )}

      {stats && stats.length > 0 && !isSleeping && (
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

export function SystemStatus() {
  const [systemData, setSystemData] = useState<SystemStatusData | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetrySummary | null>(null);
  const [lastError, setLastError] = useState<boolean>(false);
  const [bootPhase, setBootPhase] = useState<BootPhase>("idle");
  const [bootElapsed, setBootElapsed] = useState(0);
  const bootTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootStartRef = useRef<number | null>(null);
  const awakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Main polling loop
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
          if (telemetry) setTelemetryData(telemetry);
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

  // When lastError clears while booting → transition to awake, then idle after 3s
  useEffect(() => {
    if (!lastError && bootPhase === "booting") {
      if (bootTimerRef.current) {
        clearInterval(bootTimerRef.current);
        bootTimerRef.current = null;
      }
      setBootPhase("awake");
      awakeTimeoutRef.current = setTimeout(() => {
        setBootPhase("idle");
      }, 3000);
    }
  }, [lastError, bootPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearInterval(bootTimerRef.current);
      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
    };
  }, []);

  function handleBoot() {
    if (bootPhase === "booting") return;
    setBootPhase("booting");
    setBootElapsed(0);
    bootStartRef.current = Date.now();

    bootTimerRef.current = setInterval(() => {
      if (bootStartRef.current) {
        setBootElapsed(Math.floor((Date.now() - bootStartRef.current) / 1000));
      }
    }, 1000);

    // Fire the wake request — just needs to reach Render to trigger a cold start.
    // The 5-second poll detects the actual recovery; this just kicks the door.
    if (BACKEND_URL) {
      fetch(`${BACKEND_URL}/api/health`).catch(() => {});
    }
  }

  const backendSleeping = lastError && !systemData;
  const backendReconnecting = lastError && !!systemData;

  const frontendStatus: NodeStatus = lastError
    ? systemData
      ? (systemData.services.find((s) => s.name === "frontend")?.status === "up" ? "healthy" : "down")
      : "sleeping"
    : systemData?.services.find((s) => s.name === "frontend")?.status === "up"
      ? "healthy"
      : systemData
        ? "down"
        : null;

  const backendStatus: NodeStatus = backendSleeping || (bootPhase === "booting")
    ? "sleeping"
    : backendReconnecting
      ? "down"
      : systemData?.services.find((s) => s.name === "backend")?.status === "up"
        ? "healthy"
        : systemData
          ? "down"
          : null;

  const databaseStatus: NodeStatus = backendSleeping || (bootPhase === "booting")
    ? "sleeping"
    : systemData?.services.find((s) => s.name === "database")?.status === "up"
      ? "healthy"
      : systemData
        ? "down"
        : null;

  const backendService = systemData?.services.find((s) => s.name === "backend");
  const frontendService = systemData?.services.find((s) => s.name === "frontend");
  const databaseService = systemData?.services.find((s) => s.name === "database");

  return (
    <section className="mt-16">
      {/* Header */}
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
            : backendReconnecting
              ? "reconnecting…"
              : bootPhase === "booting"
                ? `waking… ${bootElapsed}s`
                : lastError
                  ? "sleeping"
                  : "loading…"}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Every node in this pipeline is either live or local. The three right-hand nodes report
        their health in real time — polled every {POLL_INTERVAL_MS / 1000} seconds from the backend, no
        streaming infrastructure involved.
      </p>

      {/* Boot banner — visible when backend is asleep or booting */}
      {(backendSleeping || bootPhase === "booting" || bootPhase === "awake") && (
        <div
          className={`mt-8 rounded-xl border p-6 transition-all duration-500 ${
            bootPhase === "awake"
              ? "border-accent-primary/30 bg-accent-primary/5"
              : bootPhase === "booting"
                ? "border-text-secondary/20 bg-surface"
                : "border-text-secondary/20 bg-surface"
          }`}
        >
          {bootPhase === "idle" && backendSleeping && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Backend is sleeping
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Render&apos;s free tier spins down after inactivity. Boot it up to see live metrics — takes up to 60 seconds.
                </p>
              </div>
              <button
                onClick={handleBoot}
                className="shrink-0 rounded-lg border border-accent-primary/40 bg-accent-primary/10 px-5 py-2.5 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/20"
              >
                Boot it up
              </button>
            </div>
          )}

          {bootPhase === "booting" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Waking Render instance…
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Cold start in progress. Nodes will light up as services come online.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums text-text-primary">
                    {bootElapsed}s
                  </p>
                  <p className="text-xs text-text-secondary">elapsed</p>
                </div>
                {/* Animated progress bar */}
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-text-secondary/15">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-all duration-1000"
                    style={{ width: `${Math.min((bootElapsed / 60) * 100, 95)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {bootPhase === "awake" && (
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-accent-primary" />
              <p className="text-sm font-semibold text-accent-primary">
                System is live — all nodes online
              </p>
            </div>
          )}
        </div>
      )}

      {/* Aggregate stats bar */}
      {telemetryData && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "commits pushed", value: `${telemetryData.commit_count}` },
            { label: "AI sessions logged", value: `${telemetryData.session_count}` },
            { label: "prompts sent", value: `${telemetryData.total_prompt_count}` },
            {
              label: "hours of dev",
              value: `${telemetryData.total_dev_hours_estimate.toFixed(1)}h`,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-text-secondary/15 bg-surface p-3">
              <p className="text-xs text-text-secondary">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-accent-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Architecture pipeline */}
      <div className="mt-12">
        {/* Row 1: Local → GitHub → Hosting */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Column 1: Local */}
          <div className="min-w-0 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
              Local layer
            </p>
            <div className="mt-3 space-y-3">
              <PipelineNode
                title="Claude Code"
                label="Local dev"
                description="AI coding assistant in editor"
                stats={
                  telemetryData
                    ? [{ label: "Prompts", value: `${telemetryData.total_prompt_count}` }]
                    : undefined
                }
              />
              <PipelineNode
                title="Git hooks"
                label="Local tooling"
                description="Post-commit telemetry + pre-push validation"
                stats={
                  telemetryData
                    ? [{ label: "Sessions", value: `${telemetryData.session_count}` }]
                    : undefined
                }
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden shrink-0 flex-col items-center justify-center pt-10 lg:flex">
            <div className="h-px w-12 bg-text-secondary/20" />
            <p className="mt-1 whitespace-nowrap text-center text-xs text-text-secondary/50">
              commit + log
            </p>
          </div>

          {/* Column 2: GitHub */}
          <div className="min-w-0 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
              Source control
            </p>
            <div className="mt-3">
              <PipelineNode
                title="GitHub"
                label="Version control"
                description="Source of truth — every push to main triggers Vercel + Render deploys"
                stats={
                  telemetryData
                    ? [{ label: "Commits", value: `${telemetryData.commit_count}` }]
                    : undefined
                }
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden shrink-0 flex-col items-center justify-center pt-10 lg:flex">
            <div className="h-px w-12 bg-text-secondary/20" />
            <p className="mt-1 whitespace-nowrap text-center text-xs text-text-secondary/50">
              auto-deploy
            </p>
          </div>

          {/* Column 3: Hosting */}
          <div className="min-w-0 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
              Hosting
            </p>
            <div className="mt-3 space-y-3">
              <PipelineNode
                title="Vercel"
                label="Frontend"
                description="Next.js — CDN-distributed, auto-deploys from main"
                status={frontendStatus}
                detail={frontendService?.detail}
              />
              <PipelineNode
                title="Render + Docker"
                label="Backend"
                description="FastAPI in a Docker container, auto-deploys from main"
                status={backendStatus}
                detail={bootPhase === "booting" ? "cold start in progress" : backendService?.detail}
                stats={
                  systemData && backendService
                    ? [
                        {
                          label: "Uptime",
                          value: formatUptime(systemData.backend_uptime_seconds),
                        },
                      ]
                    : undefined
                }
              />
            </div>
          </div>

          {/* Arrow to Database */}
          <div className="hidden shrink-0 flex-col items-center justify-center pt-10 lg:flex">
            <div className="h-px w-12 bg-text-secondary/20" />
            <p className="mt-1 whitespace-nowrap text-center text-xs text-text-secondary/50">
              r/w events
            </p>
          </div>

          {/* Column 4: Data */}
          <div className="min-w-0 lg:w-1/4">
            <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
              Data
            </p>
            <div className="mt-3">
              <PipelineNode
                title="Neon"
                label="Database"
                description="Serverless Postgres — also written to directly by git hook on every commit"
                status={databaseStatus}
                detail={databaseService?.detail}
                stats={
                  telemetryData
                    ? [{ label: "Events", value: `${telemetryData.session_count}` }]
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Direct psql note — the interesting data flow detail */}
        {!backendSleeping && (
          <p className="mt-4 text-xs text-text-secondary/50">
            Git hook → Neon: post-commit writes telemetry directly to the database via psql,
            bypassing the backend entirely — commits show on the dashboard before Render finishes deploying.
          </p>
        )}
      </div>

      {/* Initial loading state (before first poll resolves either way) */}
      {!systemData && !lastError && bootPhase === "idle" && (
        <div className="mt-8 rounded-xl border border-dashed border-text-secondary/30 bg-surface p-8 text-center text-sm text-text-secondary">
          Checking service health…
        </div>
      )}
    </section>
  );
}
