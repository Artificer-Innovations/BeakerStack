-- Bootstrap adopter-owned schema and migration tracking.
-- Idempotent — safe to run multiple times.

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.schema_migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
