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

function StatusDot({ status }: { status: NodeStatus }) {
  if (!status) return null;
  const dot: Record<Exclude<NodeStatus, null>, string> = {
    healthy: "bg-accent-primary animate-pulse",
    down: "bg-accent-alert",
    sleeping: "bg-text-secondary/40 animate-pulse",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot[status]}`} aria-hidden />;
}

// Static detail content shown in the info panel when a node is hovered or selected
const NODE_INFO: Record<string, { heading: string; body: string }> = {
  "claude-code": {
    heading: "Claude Code — local AI coding assistant",
    body: "Runs in the editor as an interactive coding agent. Every prompt increments a counter in .ai/session_counter.json. The post-commit hook reads this counter to stamp prompt_count on each telemetry row, then resets it — so the \"prompts\" figure on the dashboard is a running total of every back-and-forth that went into building this.",
  },
  "git-hooks": {
    heading: "Git hooks — local automation layer",
    body: "Two hooks, wired via git config core.hooksPath. pre-push: runs pytest before any push reaches GitHub — a failing test blocks the push entirely. post-commit: reads Claude Code transcripts, sums tokens by category (input / output / cache-write — cache-reads deliberately excluded to avoid 5–10× inflation), and dual-writes one structured row to both the JSONL worklog and Neon via direct psql. No backend required; commits show up on the dashboard before Render finishes deploying.",
  },
  "github": {
    heading: "GitHub — source of truth",
    body: "Every push to main triggers two parallel webhooks: Vercel picks up frontend changes and deploys to its CDN within ~1 minute; Render detects backend changes and rebuilds the Docker container (takes 2–5 minutes). Frontend-only commits don't trigger a Render rebuild — Render only deploys when backend files change.",
  },
  "vercel": {
    heading: "Vercel — Next.js frontend",
    body: "Hosts the Next.js app on Vercel's global CDN. Server-rendered pages (dashboard, home) run as edge functions and call the Render backend over HTTPS. The frontend never connects to Neon directly — all database reads go through the FastAPI backend. Deploys are zero-downtime; Vercel swaps the edge network atomically.",
  },
  "render": {
    heading: "Render + Docker — FastAPI backend",
    body: "Runs the FastAPI app inside a Docker container on Render's free tier. Free tier spins the container down after ~15 minutes of inactivity — the first request after sleep triggers a cold start that takes 30–60 seconds. Uptime shown here resets on every deploy or cold start. The boot button on this page sends a wake request directly to the backend, then the 5-second poll detects when it responds.",
  },
  "neon": {
    heading: "Neon — serverless Postgres",
    body: "Stores a single events table. Every coding session, commit, and demo-agent request lands here as a structured row. Two write paths exist intentionally: the git post-commit hook writes via direct psql on every commit (bypassing the backend entirely), and the FastAPI backend writes ai_request_completed rows when the demo agent answers a question. This keeps the two agent layers — coding agent and in-app agent — cleanly separated in the data.",
  },
};

interface PipelineNodeProps {
  id: string;
  title: string;
  label: string;
  status?: NodeStatus;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

function PipelineNode({ id, title, label, status, isActive, onHover, onClick }: PipelineNodeProps) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(id)}
      className={`w-full rounded-xl border p-4 text-left shadow-sm transition-all duration-150 ${
        isActive
          ? "border-accent-primary/40 bg-surface ring-1 ring-accent-primary/20"
          : "border-text-secondary/15 bg-surface hover:border-text-secondary/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{label}</p>
        </div>
        {status && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === "healthy"
                ? "bg-accent-primary/15 text-accent-secondary"
                : status === "sleeping"
                  ? "bg-text-secondary/10 text-text-secondary"
                  : "bg-accent-alert/15 text-accent-alert"
            }`}
          >
            <StatusDot status={status} />
            {status}
          </span>
        )}
      </div>
    </button>
  );
}

export function SystemStatus() {
  const [systemData, setSystemData] = useState<SystemStatusData | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetrySummary | null>(null);
  const [lastError, setLastError] = useState<boolean>(false);
  const [bootPhase, setBootPhase] = useState<BootPhase>("idle");
  const [bootElapsed, setBootElapsed] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [lockedNode, setLockedNode] = useState<string | null>(null);
  const bootTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootStartRef = useRef<number | null>(null);
  const awakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!lastError && bootPhase === "booting") {
      if (bootTimerRef.current) { clearInterval(bootTimerRef.current); bootTimerRef.current = null; }
      setBootPhase("awake");
      awakeTimeoutRef.current = setTimeout(() => setBootPhase("idle"), 3000);
    }
  }, [lastError, bootPhase]);

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
      if (bootStartRef.current) setBootElapsed(Math.floor((Date.now() - bootStartRef.current) / 1000));
    }, 1000);
    if (BACKEND_URL) fetch(`${BACKEND_URL}/api/health`).catch(() => {});
  }

  function handleNodeHover(id: string | null) {
    if (!lockedNode) setActiveNode(id);
  }

  function handleNodeClick(id: string) {
    if (lockedNode === id) {
      setLockedNode(null);
      setActiveNode(null);
    } else {
      setLockedNode(id);
      setActiveNode(id);
    }
  }

  const displayNode = activeNode ?? lockedNode;

  const backendSleeping = lastError && !systemData;
  const getStatus = (name: string): NodeStatus => {
    if (backendSleeping || bootPhase === "booting") {
      if (name === "vercel") return null; // vercel is independent
      return "sleeping";
    }
    const svc = systemData?.services.find((s) => s.name === name);
    if (!svc) return null;
    return svc.status === "up" ? "healthy" : "down";
  };

  const servicesOnline = systemData
    ? systemData.services.filter((s) => s.status === "up").length
    : null;
  const totalServices = systemData?.services.length ?? 3;

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
            : bootPhase === "booting"
              ? `waking… ${bootElapsed}s`
              : lastError
                ? "sleeping"
                : "loading…"}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Every node in this pipeline is either live or local. The three right-hand nodes report
        their health in real time — polled every {POLL_INTERVAL_MS / 1000} seconds from the
        backend, no streaming infrastructure involved.
      </p>

      {/* Boot banner */}
      {(backendSleeping || bootPhase === "booting" || bootPhase === "awake") && (
        <div
          className={`mt-8 rounded-xl border p-5 transition-all duration-500 ${
            bootPhase === "awake"
              ? "border-accent-primary/30 bg-accent-primary/5"
              : "border-text-secondary/20 bg-surface"
          }`}
        >
          {bootPhase === "idle" && backendSleeping && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Backend is sleeping</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Render&apos;s free tier spins down after inactivity. Takes up to 60 seconds to wake.
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
                <p className="text-sm font-semibold text-text-primary">Waking Render instance…</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Cold start in progress. Nodes will light up as services come online.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-semibold tabular-nums text-text-primary">
                  {bootElapsed}s
                </p>
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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-primary" />
              <p className="text-sm font-semibold text-accent-primary">
                System is live — all nodes online
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats bar — infra-specific, not duplicating the dashboard above */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "commits pushed",
            value: telemetryData ? `${telemetryData.commit_count}` : "—",
          },
          {
            label: "services online",
            value: servicesOnline !== null ? `${servicesOnline} / ${totalServices}` : "—",
          },
          {
            label: "backend uptime",
            value: systemData ? formatUptime(systemData.backend_uptime_seconds) : "—",
          },
          {
            label: "pre-push tests",
            value: "2 passing",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-text-secondary/15 bg-surface p-3">
            <p className="text-xs text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-accent-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
        {/* Column 1: Local */}
        <div className="min-w-0 space-y-2 lg:w-1/4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            Local layer
          </p>
          <PipelineNode
            id="claude-code"
            title="Claude Code"
            label="Local dev"
            isActive={activeNode === "claude-code" || lockedNode === "claude-code"}
            onHover={handleNodeHover}
            onClick={handleNodeClick}
          />
          <PipelineNode
            id="git-hooks"
            title="Git hooks"
            label="Local tooling"
            isActive={activeNode === "git-hooks" || lockedNode === "git-hooks"}
            onHover={handleNodeHover}
            onClick={handleNodeClick}
          />
        </div>

        {/* Connector */}
        <div className="hidden items-center justify-center pt-8 lg:flex">
          <div className="flex flex-col items-center gap-1">
            <div className="h-px w-10 bg-text-secondary/20" />
          </div>
        </div>

        {/* Column 2: GitHub */}
        <div className="min-w-0 lg:w-1/4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            Source control
          </p>
          <div className="mt-2">
            <PipelineNode
              id="github"
              title="GitHub"
              label="Version control"
              isActive={activeNode === "github" || lockedNode === "github"}
              onHover={handleNodeHover}
              onClick={handleNodeClick}
            />
          </div>
        </div>

        {/* Connector */}
        <div className="hidden items-center justify-center pt-8 lg:flex">
          <div className="h-px w-10 bg-text-secondary/20" />
        </div>

        {/* Column 3: Hosting */}
        <div className="min-w-0 space-y-2 lg:w-1/4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            Hosting
          </p>
          <PipelineNode
            id="vercel"
            title="Vercel"
            label="Frontend"
            status={getStatus("frontend")}
            isActive={activeNode === "vercel" || lockedNode === "vercel"}
            onHover={handleNodeHover}
            onClick={handleNodeClick}
          />
          <PipelineNode
            id="render"
            title="Render + Docker"
            label="Backend"
            status={getStatus("backend")}
            isActive={activeNode === "render" || lockedNode === "render"}
            onHover={handleNodeHover}
            onClick={handleNodeClick}
          />
        </div>

        {/* Connector */}
        <div className="hidden items-center justify-center pt-8 lg:flex">
          <div className="h-px w-10 bg-text-secondary/20" />
        </div>

        {/* Column 4: Data */}
        <div className="min-w-0 lg:w-1/4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            Data
          </p>
          <div className="mt-2">
            <PipelineNode
              id="neon"
              title="Neon"
              label="Database"
              status={getStatus("database")}
              isActive={activeNode === "neon" || lockedNode === "neon"}
              onHover={handleNodeHover}
              onClick={handleNodeClick}
            />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={`mt-4 min-h-[5rem] rounded-xl border border-text-secondary/15 bg-surface p-5 transition-all duration-200 ${
          displayNode ? "opacity-100" : "opacity-40"
        }`}
      >
        {displayNode && NODE_INFO[displayNode] ? (
          <div>
            <p className="text-xs font-semibold text-text-primary">
              {NODE_INFO[displayNode].heading}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {NODE_INFO[displayNode].body}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-secondary/50">
            Hover or click any node to learn how it fits into the pipeline.
          </p>
        )}
      </div>

      {/* Loading state */}
      {!systemData && !lastError && bootPhase === "idle" && (
        <div className="mt-4 rounded-xl border border-dashed border-text-secondary/30 bg-surface p-6 text-center text-sm text-text-secondary">
          Checking service health…
        </div>
      )}
    </section>
  );
}
