'use client';

export default function TelemetryAudit() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Telemetry Audit Log</h1>
        <p className="text-lg text-slate-600 mb-8">Full transparency on data collection bugs, fixes, and validation.</p>

        {/* Known Issues Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-6 border-l-4 border-amber-500">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🐛 Known Issues (Fixed)</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">1. Cache-Read Token Misattribution</h3>
              <p className="text-slate-700 mb-2">
                <strong>Issue:</strong> Cache-read tokens (from previously-cached prompts being re-used) were being attributed to the current session, inflating token counts by 5-10x.
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Example:</strong> A session using cached context from earlier would show 11M+ cache_read tokens, even though it only generated 300K fresh tokens.
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                ⚠️ <strong>Affected data:</strong> All entries before 2026-06-22 20:06
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">2. Faulty window_started_at Derivation</h3>
              <p className="text-slate-700 mb-2">
                <strong>Issue:</strong> Session windows were derived from "earliest transcript in a 30-min fallback window," which could find transcripts from hours earlier, retroactively capturing entire afternoons of work into single sessions.
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Example:</strong> A user working 18:46–19:47 would have window_started_at set to 18:46, then enrich would find and count ALL transcripts from that 1-hour span, inflating the session.
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                ⚠️ <strong>Affected data:</strong> All entries (most severe on 2026-06-22)
              </p>
            </div>
          </div>
        </section>

        {/* Fixes Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-6 border-l-4 border-green-500">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">✅ Fixes Applied</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Fix #1: Skip Cache-Read Tokens</h3>
              <p className="text-slate-700 mb-2">
                Cache-read tokens are now explicitly excluded from token enrichment. They don't represent work done in the current session—they're artifacts of how the Claude API manages cached context.
              </p>
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded">
                ✓ Applied: 2026-06-22 20:05 (commit 8df6a58)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Fix #2: Git-Based Session Windows</h3>
              <p className="text-slate-700 mb-2">
                Session boundaries are now defined by git commit timestamps (previous commit → current commit) instead of inferred from transcripts. This creates clean, deterministic session windows.
              </p>
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded">
                ✓ Applied: 2026-06-22 20:06 (commit 2853933)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Fix #3: Dual-Write Guarantee + Counter Reset</h3>
              <p className="text-slate-700 mb-2">
                The end-session skill now dual-writes to both the jsonl (durable record) and the live database, and ALWAYS resets the counter in a try-finally block, preventing duplicate logging.
              </p>
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded">
                ✓ Applied: 2026-06-22 19:54 (commit 94e1387)
              </p>
            </div>
          </div>
        </section>

        {/* Validation Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-6 border-l-4 border-blue-500">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🔍 Validation Against Extension</h2>

          <p className="text-slate-700 mb-4">
            Historical data (6/7–6/19) was compared against Claude Code extension token counts. After fixes:
          </p>

          <table className="w-full text-sm mb-4">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-right font-semibold">Our Count</th>
                <th className="px-4 py-2 text-right font-semibold">Extension</th>
                <th className="px-4 py-2 text-right font-semibold">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2">6/7</td>
                <td className="px-4 py-2 text-right font-mono">1,001K</td>
                <td className="px-4 py-2 text-right font-mono">965K</td>
                <td className="px-4 py-2 text-right text-green-700 font-semibold">+4%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2">6/8</td>
                <td className="px-4 py-2 text-right font-mono">1,022K</td>
                <td className="px-4 py-2 text-right font-mono">1,031K</td>
                <td className="px-4 py-2 text-right text-green-700 font-semibold">−1%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2">6/19</td>
                <td className="px-4 py-2 text-right font-mono">361K</td>
                <td className="px-4 py-2 text-right font-mono">374K</td>
                <td className="px-4 py-2 text-right text-green-700 font-semibold">−3%</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-2 font-semibold">6/22</td>
                <td className="px-4 py-2 text-right font-mono text-amber-700">Incomplete</td>
                <td className="px-4 py-2 text-right font-mono">940K</td>
                <td className="px-4 py-2 text-right text-amber-700 font-semibold">N/A</td>
              </tr>
            </tbody>
          </table>

          <p className="text-sm text-slate-600">
            <strong>Note:</strong> 6/22 data is incomplete because fixes were applied mid-day. Only commits logged after 20:06 use the corrected logic. Future days will be fully accurate.
          </p>
        </section>

        {/* Data Trust Section */}
        <section className="bg-white rounded-lg shadow-md p-8 border-l-4 border-purple-500">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📋 Data Trust Levels</h2>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-900">🔴 Before 2026-06-22 20:05</p>
              <p className="text-red-800 text-sm mt-1">
                Cache-read tokens inflated 5-10x. Token counts unreliable. <strong>Do not use for cost estimates or hiring metrics.</strong>
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold text-yellow-900">🟡 2026-06-22 20:05–20:06</p>
              <p className="text-yellow-800 text-sm mt-1">
                Cache-read fixed, but window_started_at still using transcript derivation. Use with caution.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-900">🟢 From 2026-06-22 20:06 onward</p>
              <p className="text-green-800 text-sm mt-1">
                Full fixes applied. Cache-read excluded, git-based windows. <strong>Safe for all use.</strong> Validated within 4% of Claude Code extension.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-slate-100 rounded text-sm text-slate-700">
          <p>
            <strong>Last updated:</strong> 2026-06-22 20:06 UTC
          </p>
          <p className="mt-2">
            Questions? Check <code className="bg-white px-2 py-1 rounded text-slate-900">docs/worklog/WORKLOG.md</code> for the detailed engineering notes.
          </p>
        </div>
      </div>
    </div>
  );
}
