'use client';

export default function TelemetryAudit() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
          Transparency
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Telemetry audit log
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          Full transparency on known issues, fixes applied, and data validation. See exactly which periods of telemetry are reliable.
        </p>

        {/* Known Issues Section */}
        <div className="mt-12 space-y-6">
          <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Known Issues (Fixed)</h2>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-text-primary">Cache-Read Token Misattribution</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Cache-read tokens (from previously-cached prompts being re-used) were being attributed to the current session, inflating token counts by 5–10x.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> A session using cached context from earlier would show 11M+ cache_read tokens, even though it only generated 300K fresh tokens.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: All entries before 2026-06-22 20:06
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Faulty window_started_at Derivation</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Session windows were derived from "earliest transcript in a 30-min fallback window," which could find transcripts from hours earlier, retroactively capturing entire afternoons of work into single sessions.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> A user working 18:46–19:47 would have window_started_at set to 18:46, then enrich would count all transcripts from that 1-hour span, inflating the session.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: All entries, most severe on 2026-06-22
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Cache-Read Tokens Excluded from Cost Estimates</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Cache-read tokens were correctly excluded from the token count metric (right decision — they re-read prior context and would inflate counts 5–10x). But the cost formula also never populated the cache_read variable, so it silently added $0 for them instead of charging at $0.30/MTok. The dashboard said "Claude list-rate pricing" but quietly missed this category.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> The VS Code Claude Code extension reported 133M cache-hit tokens for this project. At $0.30/MTok that is ~$40 of real API cost that was not captured in any session estimate.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: All cost estimates before 2026-06-30
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Backend Sleep Misread as a Crash</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Early versions of the dashboard showed the backend as "down" when Render's free-tier container was simply sleeping after inactivity. The system-status endpoint returns null service data during sleep, which is indistinguishable from a crash at the API boundary.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> A recruiter visiting the dashboard after a 20-minute gap would see all backend services marked down, with no way to know the system would recover in under 60 seconds.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: All periods on Render free tier
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">GitHub Actions Double Deploy</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  After adding the GitHub Actions CI/CD pipeline, Render and Vercel auto-deploy were still enabled. Every push to main triggered two backend deploys and two frontend deploys simultaneously — one from the git webhook and one from Actions.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: Any push after GitHub Actions was wired up without disabling platform auto-deploy
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Shell Injection Risk in GitHub Actions Workflow</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The initial workflow templated <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{"${{ github.event.head_commit.message }}"}</code> directly into the shell command for the jq payload. A commit message containing a single quote, backtick, or newline would break the JSON encoding and could in principle inject shell commands.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-alert/10 px-3 py-1 text-xs text-accent-alert">
                  Affected: Initial GitHub Actions workflow draft (before jq --arg fix)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixes Section */}
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Fixes Applied</h2>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-text-primary">Fix 1: Skip Cache-Read Tokens</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Cache-read tokens are now explicitly excluded from token enrichment. They don't represent work done in the current session—they're artifacts of how the Claude API manages cached context.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-22 20:05 (commit 8df6a58)
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 2: Git-Based Session Windows</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Session boundaries are now defined by git commit timestamps (previous commit → current commit) instead of inferred from transcripts. This creates clean, deterministic session windows.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-22 20:06 (commit 2853933)
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 3: Dual-Write Guarantee + Counter Reset</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The end-session skill now dual-writes to both the jsonl (durable record) and the live database, and always resets the counter in a try-finally block, preventing duplicate logging.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-22 19:54 (commit 94e1387)
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 5: "Sleeping" Status Distinct from "Down"</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The dashboard pipeline now distinguishes between "sleeping" (Render container inactive, will recover) and "down" (genuine failure). When the backend is unreachable, nodes show a pulsing grey "sleeping" badge instead of red "down." A "Boot it up" button fires a wake request to the Render instance and polls every 5 seconds until it recovers.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-29
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 6: GitHub Actions Graceful Skip Without Secrets</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Deploy steps in the workflow now check whether their required secret is present before attempting to run. If <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">RENDER_DEPLOY_HOOK_URL</code> or <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">VERCEL_TOKEN</code> are empty, the step prints a message and exits 0 — no red build, no confusing failure. The workflow documents that auto-deploy should be disabled on both platforms once secrets are wired up.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-30 (commit pending)
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 7: jq --arg for Safe Commit Message Encoding</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The GitHub Actions workflow now passes all GitHub context variables (commit SHA, message, actor, run ID) via <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">jq --arg</code> rather than direct shell interpolation. jq handles quoting and escaping internally, so commit messages with apostrophes, quotes, or special characters no longer risk breaking the JSON payload.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-30 (commit pending)
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 8: Cache-Read Cost Now Included in Estimates</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Cache-read tokens (context re-used from prior sessions) were correctly excluded from the token count metric to avoid 5–10x inflation. However, they were also accidentally excluded from the cost estimate — the formula had a slot for them but never populated the variable. Anthropic charges $0.30/MTok for cache reads, roughly 10x cheaper than fresh input but still real cost.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> 133M cache-read tokens across the project lifetime at $0.30/MTok = ~$40 that was not captured in any session estimate before this fix.
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  The hook now reads <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">cache_read_input_tokens</code> from transcripts and adds it to the cost estimate at $0.30/MTok. The token count metric is unchanged — cache_read tokens remain excluded there, because they inflate "work done" without representing new model work.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-30 — sessions before this date are missing cache-read cost
                </p>
              </div>

              <div className="border-t border-text-secondary/10 pt-6">
                <h3 className="font-semibold text-text-primary">Fix 4: Session Window Length Cap (4h max)</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The git-based window approach (Fix 2) has a hidden edge case: when there is a multi-day gap between commits, the previous commit timestamp is too stale to be a valid session boundary. A 7-day gap between commits produced a 167-hour session that swept up the entire transcript history, inflating the hours figure to ~178h when the real total was ~11h.
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Example:</strong> June 22nd was the last commit before the Neon/Vercel/Render setup session on June 29th. No commits landed during the setup days, so the hook saw a 7-day gap and used June 22nd as the window start.
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  The hook now enforces a 4-hour cap: if the previous commit is more than 4 hours before the current one, the window clamps to 30 minutes before the current commit. The bad row (id: f1cf1dfb) was deleted from both the jsonl and Neon.
                </p>
                <p className="mt-3 inline-block rounded bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  Applied: 2026-06-29 (commit pending)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Section */}
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Validation Against Extension</h2>

            <p className="mt-4 text-sm text-text-secondary">
              Historical data (6/7–6/19) was compared against Claude Code extension token counts. After fixes:
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text-secondary/15">
                    <th className="px-4 py-2 text-left font-semibold text-text-primary">Date</th>
                    <th className="px-4 py-2 text-right font-semibold text-text-primary">Our Count</th>
                    <th className="px-4 py-2 text-right font-semibold text-text-primary">Extension</th>
                    <th className="px-4 py-2 text-right font-semibold text-text-primary">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-secondary/10">
                  <tr>
                    <td className="px-4 py-3 text-text-primary">6/7</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">1,001K</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">965K</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent-primary">+4%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-text-primary">6/8</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">1,022K</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">1,031K</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent-primary">−1%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-text-primary">6/19</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">361K</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">374K</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent-primary">−3%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-text-primary font-semibold">6/22</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">Incomplete</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">940K</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent-alert">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-text-secondary">
              <strong>Note:</strong> 6/22 data is incomplete because fixes were applied mid-day. Only commits logged after 20:06 use the corrected logic. Future days will be fully accurate.
            </p>
          </div>
        </div>

        {/* Data Trust Section */}
        <div className="mt-6">
          <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Data Trust Levels</h2>

            <div className="mt-6 space-y-3">
              <div className="rounded-lg bg-accent-alert/5 border border-accent-alert/20 p-4">
                <p className="font-semibold text-text-primary">Before 2026-06-22 20:05</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Cache-read tokens inflated 5–10x. Token counts unreliable. Do not use for cost estimates or hiring metrics.
                </p>
              </div>

              <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/20 p-4">
                <p className="font-semibold text-text-primary">2026-06-22 20:05–20:06</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Cache-read fixed, but window_started_at still using transcript derivation. Use with caution.
                </p>
              </div>

              <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/20 p-4">
                <p className="font-semibold text-text-primary">2026-06-22 20:06 – 2026-06-29</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Cache-read excluded and git-based windows applied. One bad row (167h) from a 7-day commit gap was manually deleted from both jsonl and database on 2026-06-29.
                </p>
              </div>

              <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/20 p-4">
                <p className="font-semibold text-text-primary">From 2026-06-29 onward</p>
                <p className="mt-1 text-xs text-text-secondary">
                  All fixes applied including the 4-hour session window cap. Safe for all use. Hours figure validated at ~11h which matches expected total.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-text-secondary/15 bg-surface p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            <strong>Last updated:</strong> 2026-06-30 UTC
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            For detailed engineering notes, see <code className="rounded bg-background px-2 py-1 text-xs text-text-primary font-mono">docs/worklog/WORKLOG.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
