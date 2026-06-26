-- Migration: create job_assignments table
-- Associates workers with jobs, recording their role and scheduled hours.
-- Tradie vertical — included in Phase 0 from day one.

CREATE TYPE assignment_role AS ENUM (
  'lead',
  'apprentice',
  'supervisor',
  'subbie'
);

CREATE TABLE job_assignments (
  job_id         uuid            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id        uuid            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role           assignment_role NOT NULL DEFAULT 'lead',
  scheduled_for  date,
  hours_logged   numeric(6, 2)   NOT NULL DEFAULT 0,
  created_at     timestamptz     NOT NULL DEFAULT now(),
  updated_at     timestamptz     NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, user_id)
);

CREATE TRIGGER job_assignments_updated_at
  BEFORE UPDATE ON job_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes on foreign keys.
CREATE INDEX job_assignments_job_id_idx  ON job_assignments (job_id);
CREATE INDEX job_assignments_user_id_idx ON job_assignments (user_id);

ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

-- Isolate via the parent job's org_id.
CREATE POLICY tenant_read ON job_assignments
  FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE org_id IN (SELECT auth_user_org_ids())
    )
  );

CREATE POLICY tenant_write ON job_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM jobs WHERE org_id IN (SELECT auth_user_org_ids())
    )
  );

CREATE POLICY tenant_update ON job_assignments
  FOR UPDATE TO authenticated
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE org_id IN (SELECT auth_user_org_ids())
    )
  );

CREATE POLICY tenant_delete ON job_assignments
  FOR DELETE TO authenticated
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE org_id IN (SELECT auth_user_org_ids())
    )
  );
