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
            <strong>Last updated:</strong> 2026-06-29 UTC
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            For detailed engineering notes, see <code className="rounded bg-background px-2 py-1 text-xs text-text-primary font-mono">docs/worklog/WORKLOG.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
