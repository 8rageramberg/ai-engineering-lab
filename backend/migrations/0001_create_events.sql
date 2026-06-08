-- Core telemetry table, schema as specified in .ai/TELEMETRY_RULES.md.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  feature_area TEXT,
  task_id UUID,
  commit_sha TEXT,
  model_provider TEXT,
  model_name TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS events_event_type_idx ON events (event_type);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at);
