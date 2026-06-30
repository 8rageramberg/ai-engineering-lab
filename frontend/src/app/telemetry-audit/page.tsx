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

        {/* Token Methodology Section */}
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-text-secondary/15 bg-surface p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Token Counting Methodology</h2>

            <p className="mt-4 text-sm text-text-secondary">
              Every coding session is logged by a post-commit git hook that reads the local Claude
              Code transcript files and sums token usage from the Anthropic API response objects. The
              Anthropic API reports four distinct token categories per message. Here is exactly what
              we do with each one:
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text-secondary/15">
                    <th className="px-4 py-2 text-left font-semibold text-text-primary">Category</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-primary">API field</th>
                    <th className="px-4 py-2 text-center font-semibold text-text-primary">In token count?</th>
                    <th className="px-4 py-2 text-center font-semibold text-text-primary">In cost estimate?</th>
                    <th className="px-4 py-2 text-right font-semibold text-text-primary">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-secondary/10">
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">Input</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">input_tokens</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-right text-text-secondary">$3 / MTok</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">Output</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">output_tokens</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-right text-text-secondary">$15 / MTok</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">Cache-write</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">cache_creation_input_tokens</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-center text-accent-primary">Yes</td>
                    <td className="px-4 py-3 text-right text-text-secondary">$3.75 / MTok</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">Cache-read</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">cache_read_input_tokens</td>
                    <td className="px-4 py-3 text-center text-text-secondary/50">No</td>
                    <td className="px-4 py-3 text-center text-text-secondary/50">No</td>
                    <td className="px-4 py-3 text-right text-text-secondary">$0.30 / MTok</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-text-secondary/10 pt-6">
              <h3 className="font-semibold text-text-primary">Why cache-read tokens are excluded</h3>
              <p className="mt-2 text-sm text-text-secondary">
                On every message you send, Anthropic automatically re-sends your prior conversation
                history from its cache back to Claude. This is fast and cheap, but you did not write
                those tokens — they are the same context repeated message after message. In a typical
                coding session, a single 100K-token conversation history gets re-read on every single
                message, so the totals grow with message count, not with new work done.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Including cache-read tokens in the main count would make "tokens spent building this"
                read 5–10x higher without reflecting more prompts, more output, or more actual model
                work. The early telemetry bug (Fix 1) was exactly this — sessions showed 11M+ tokens
                because cache-reads were being mixed into the total. The fix was to separate them.
              </p>
            </div>

            <div className="mt-6 border-t border-text-secondary/10 pt-6">
              <h3 className="font-semibold text-text-primary">Cache-read estimate (separate from logged data)</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Cache-read tokens are not stored in the sessions table. The VS Code Claude Code
                extension tracks them independently and reported the following for this project (all-time
                snapshot taken 2026-06-30):
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Input Cache (Hit)", value: "~134.8M" },
                  { label: "Input Cache (Miss)", value: "~3.7M" },
                  { label: "Cache hit rate", value: "97%" },
                  { label: "Est. cache-read cost", value: "~$40" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-background p-3">
                    <p className="text-xs text-text-secondary">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-text-secondary">
                The ~$40 cache-read cost is not included in the dashboard&apos;s estimated cost total.
                The extension figure covers the full project lifetime and may include sessions not
                captured by this telemetry system. It is an estimate, not an invoice.
              </p>
            </div>

            <div className="mt-6 border-t border-text-secondary/10 pt-6">
              <h3 className="font-semibold text-text-primary">Cost estimate accuracy</h3>
              <p className="mt-2 text-sm text-text-secondary">
                The per-session <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">estimated_cost_usd</code> is
                computed from the three logged token categories at Claude list rates. Known gaps that
                cause the dashboard total to understate the real API cost:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent-alert">—</span>
                  Cache-read cost (~$40 total) not included in any session estimate
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent-alert">—</span>
                  Sessions before 2026-06-22 20:05 have inflated token counts from the cache-read
                  misattribution bug (Fix 1), making their cost estimates too high
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent-alert">—</span>
                  One session with a 167h window (7-day commit gap) was deleted from both the jsonl
                  and the database (Fix 4) — its tokens are permanently unlogged
                </li>
              </ul>
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
