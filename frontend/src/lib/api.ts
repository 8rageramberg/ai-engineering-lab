// Single seam through which the frontend talks to the backend — plain HTTP/JSON
// against documented endpoints, no backend internals leaking in here. Swapping
// the backend or database later should never require touching this contract.

// Server-rendered pages run inside the frontend container and must reach the
// backend over the docker-compose network (e.g. http://backend:8000); the
// browser runs on the host and must use the published port instead. Both are
// plain env vars so each environment (compose, bare-metal, CI) can set its own.
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000");

export type HealthStatus = {
  status: string;
};

export type TelemetrySummary = {
  total_tokens: number;
  total_cost_usd: number;
  session_count: number;
  commit_count: number;
  total_prompt_count: number;
  tracked_dev_hours: number;
  total_dev_hours_estimate: number;
};

export type DailyActivity = {
  date: string;
  tokens: number;
};

export type ContainerStats = {
  name: string;
  state: string;
  uptime_seconds: number | null;
  cpu_percent: number | null;
  memory_used_bytes: number | null;
  memory_limit_bytes: number | null;
  memory_percent: number | null;
};

export type ServiceStatus = {
  name: string;
  status: "up" | "down" | string;
  detail: string;
  container: ContainerStats | null;
};

export type SystemStatus = {
  checked_at: string;
  backend_uptime_seconds: number;
  services: ServiceStatus[];
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type AskAgentResponse = {
  answer: string;
};

// Carries the backend's status code so the UI can tell "your question was too
// long" (400) and "this demo is rate-limited, try again shortly" (429) apart
// from a generic failure — the caps and the limit are part of the pitch, not
// something to paper over with one flat error message.
export class AskAgentError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export function getHealth() {
  return getJSON<HealthStatus>("/api/health");
}

export function getTelemetrySummary() {
  return getJSON<TelemetrySummary>("/api/telemetry/summary");
}

export function getDailyActivity() {
  return getJSON<DailyActivity[]>("/api/telemetry/daily-activity");
}

export function getSystemStatus() {
  return getJSON<SystemStatus>("/api/system-status");
}

export async function askAgent(question: string): Promise<AskAgentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body.detail === "string" ? body.detail : `/api/ask responded with ${res.status}`;
    throw new AskAgentError(res.status, detail);
  }

  return res.json() as Promise<AskAgentResponse>;
}
