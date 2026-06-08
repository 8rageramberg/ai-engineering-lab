"use client";

import { useState, type FormEvent } from "react";
import { askAgent, AskAgentError } from "@/lib/api";

const MAX_QUESTION_LENGTH = 300;

const EXAMPLE_QUESTIONS = [
  "How many coding sessions have gone into this project?",
  "Roughly how much has this cost in tokens so far?",
  "What was the most recent thing built here?",
];

type Status = "idle" | "loading" | "answered" | "error";

export default function DemoAgentPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "loading") return;

    setStatus("loading");
    setAnswer(null);
    setError(null);

    try {
      const response = await askAgent(trimmed);
      setAnswer(response.answer);
      setStatus("answered");
    } catch (err) {
      const message =
        err instanceof AskAgentError
          ? err.message
          : "Couldn't reach the agent — make sure the backend is running.";
      setError(message);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-primary">
          Demo agent
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Ask a small, bounded question about this project&apos;s own telemetry.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          This is the first live AI feature on the site. Type a short question about how this
          project was built — sessions, commits, tokens, cost — and{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-sm text-text-primary">
            gpt-4o-mini
          </code>{" "}
          answers it from the same{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-sm text-text-primary">events</code>{" "}
          data the dashboard reads from. The call is real — it shows up in that dashboard&apos;s
          totals moments later.
        </p>

        <form onSubmit={handleSubmit} className="mt-10">
          <label htmlFor="question" className="text-sm font-medium text-text-secondary">
            Your question
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="question"
              name="question"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
              placeholder="e.g. what was the priciest session so far?"
              maxLength={MAX_QUESTION_LENGTH}
              className="flex-1 rounded-md border border-text-secondary/25 bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-accent-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading" || !question.trim()}
              className="rounded-md bg-accent-secondary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? "Asking…" : "Ask"}
            </button>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {question.length} / {MAX_QUESTION_LENGTH} characters — short questions only, this is a
            glance-at-it feature, not a chatbot.
          </p>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuestion(example)}
              className="rounded-full border border-text-secondary/25 px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-[7rem] rounded-xl border border-text-secondary/15 bg-surface p-6 shadow-sm">
          {status === "idle" && (
            <p className="text-sm text-text-secondary">
              Ask something above, or pick one of the examples — the answer appears here.
            </p>
          )}
          {status === "loading" && <p className="text-sm text-text-secondary">Thinking…</p>}
          {status === "answered" && answer && (
            <p className="text-lg leading-7 text-text-primary">{answer}</p>
          )}
          {status === "error" && error && (
            <p className="text-sm text-accent-alert">{error}</p>
          )}
        </div>

        <div className="mt-12 rounded-xl border border-dashed border-text-secondary/30 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Why it&apos;s built this way
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
            <li>
              <span className="font-medium text-text-primary">Cheap model, on purpose —</span> every
              call uses gpt-4o-mini, the smallest model that can do this job, per this project&apos;s
              own cost-control policy.
            </li>
            <li>
              <span className="font-medium text-text-primary">It can&apos;t go off-topic —</span> the
              agent only ever sees one small, fixed snapshot of this project&apos;s telemetry — never
              arbitrary queries, never a general chat surface — both in its instructions and in the
              code path that feeds it data.
            </li>
            <li>
              <span className="font-medium text-text-primary">Hard caps, not best-effort —</span>{" "}
              questions are capped at {MAX_QUESTION_LENGTH} characters, answers are capped to a short
              one-liner, and the endpoint is rate-limited so it can&apos;t be spammed into real cost.
            </li>
            <li>
              <span className="font-medium text-text-primary">Fully observed —</span> every call
              emits a real <code className="rounded bg-surface px-1 py-0.5">ai_request_completed</code>{" "}
              event with real token and cost numbers, through the same telemetry pipeline the
              dashboard displays — closing the loop between measuring AI usage and visibly using it.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
