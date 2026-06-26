-- Migration: create audit_log table — APPEND-ONLY
-- Every compliance evaluation, AI action, and authentication event is recorded here.
-- This table is the legal foundation of the product. It must never be modified.
--
-- Append-only enforcement uses two layers:
--   1. REVOKE: removes UPDATE/DELETE/TRUNCATE privilege from all application roles.
--   2. Triggers: raise an exception for UPDATE, DELETE, and TRUNCATE operations,
--      including those attempted by the service role (which bypasses RLS but not triggers).

CREATE TABLE audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  action          text        NOT NULL,
  entity_type     text        NOT NULL,
  entity_id       uuid,
  details_json    jsonb,
  ai_model_used   text,
  prompt_version  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns.
CREATE INDEX audit_log_org_id_idx       ON audit_log (org_id);
CREATE INDEX audit_log_created_at_idx   ON audit_log (created_at);
CREATE INDEX audit_log_entity_type_idx  ON audit_log (entity_type);
CREATE INDEX audit_log_user_id_idx      ON audit_log (user_id);

-- ── Append-only enforcement ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only: % operations are not permitted. '
    'Write a corrective INSERT record instead.',
    TG_OP;
END;
$$;

-- Row-level trigger fires before UPDATE or DELETE for every row.
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Statement-level trigger fires before TRUNCATE (which bypasses row-level triggers).
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_modification();

-- Revoke write privileges at the role level as a second layer of defence.
-- The triggers above catch service_role attempts; the REVOKE handles everything else.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM authenticated, anon;

-- ── Row-level security ────────────────────────────────────────────────────

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Members can read their organisation's audit history.
CREATE POLICY tenant_read ON audit_log
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

-- Server-side code (service role) inserts all audit records.
-- Authenticated clients may also insert their own org's records (e.g. client-side actions).
CREATE POLICY tenant_insert ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_org_ids()));
