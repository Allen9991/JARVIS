-- Migration: create safety_documents table
-- Stores generated and uploaded safety documents linked to jobs.
-- Tradie vertical — included in Phase 0 from day one.

CREATE TYPE safety_doc_type AS ENUM (
  'sssp',            -- NZ: Site-Specific Safety Plan (HSWA)
  'swms',            -- AU: Safe Work Method Statement (HRCW requirement)
  'hazard_register', -- NZ/AU: ongoing hazard identification register
  'toolbox_talk',    -- NZ/AU: daily safety briefing record
  'jsa'              -- Job Safety Analysis
);

CREATE TABLE safety_documents (
  id             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid            NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id         uuid            REFERENCES jobs(id) ON DELETE SET NULL,
  doc_type       safety_doc_type NOT NULL,
  generated_by_ai boolean        NOT NULL DEFAULT false,
  content_json   jsonb,          -- structured document content (AI-generated or manually entered)
  pdf_url        text,           -- Supabase Storage URL for the generated PDF
  approved_at    timestamptz,    -- null until a team member approves the document
  expires_at     date,
  created_at     timestamptz     NOT NULL DEFAULT now(),
  updated_at     timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER safety_documents_updated_at
  BEFORE UPDATE ON safety_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes on foreign keys and common query patterns.
CREATE INDEX safety_documents_org_id_idx  ON safety_documents (org_id);
CREATE INDEX safety_documents_job_id_idx  ON safety_documents (job_id);
CREATE INDEX safety_documents_expires_at_idx ON safety_documents (expires_at);

ALTER TABLE safety_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read ON safety_documents
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_write ON safety_documents
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_update ON safety_documents
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_delete ON safety_documents
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));
