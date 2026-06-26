-- Migration: create jobs table
-- Represents a work engagement for a client at a specific address.
-- Tradie vertical — included in Phase 0 from day one.

CREATE TYPE consent_status AS ENUM (
  'not_required',
  'exempt',
  'pending',
  'granted',
  'declined'
);

CREATE TYPE job_status AS ENUM (
  'draft',
  'active',
  'on_hold',
  'complete',
  'cancelled'
);

CREATE TABLE jobs (
  id                        uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid            NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id                 uuid,           -- references a future clients table; nullable for Phase 0
  address                   text            NOT NULL,
  scope_description         text,
  building_age              integer,        -- year built; used by Site Risk Scanner and HRCW detection
  building_consent_required boolean         NOT NULL DEFAULT false,
  consent_status            consent_status  NOT NULL DEFAULT 'not_required',
  hrcw_categories           text[],         -- AU: detected High Risk Construction Work categories
  start_date                date,
  status                    job_status      NOT NULL DEFAULT 'draft',
  created_at                timestamptz     NOT NULL DEFAULT now(),
  updated_at                timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes on foreign keys and common query patterns.
CREATE INDEX jobs_org_id_idx     ON jobs (org_id);
CREATE INDEX jobs_status_idx     ON jobs (status);
CREATE INDEX jobs_start_date_idx ON jobs (start_date);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read ON jobs
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_write ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_update ON jobs
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_delete ON jobs
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));
