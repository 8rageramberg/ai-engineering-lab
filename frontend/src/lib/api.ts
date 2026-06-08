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
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth() {
  return getJSON<HealthStatus>("/api/health");
}

export function getTelemetrySummary() {
  return getJSON<TelemetrySummary>("/api/telemetry/summary");
}
