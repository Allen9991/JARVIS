-- Migration: create licences table
-- Stores trade licences for individual workers within an organisation.
-- Tradie vertical — included in Phase 0 from day one.

CREATE TYPE licence_type AS ENUM (
  'lbp',              -- NZ: Licensed Building Practitioner (MBIE)
  'electrician',      -- NZ: Registered Electrician (EWRB) | AU: state-licensed electrician
  'plumber',          -- NZ: Certified Plumber (PGDB) | AU: state-licensed plumber
  'gasfitter',        -- NZ: Certified Gasfitter (PGDB)
  'drainlayer',       -- NZ: Certified Drainlayer (PGDB)
  'site_safe',        -- NZ: Site Safe Passport
  'asbestos_class_a', -- NZ: WorkSafe Class A removal licence
  'asbestos_class_b', -- NZ: WorkSafe Class B removal licence
  'qbcc',             -- AU-QLD: Queensland Building and Construction Commission licence
  'nsw_fair_trading', -- AU-NSW: NSW Fair Trading contractor licence
  'vic_vba',          -- AU-VIC: Victorian Building Authority practitioner registration
  'wa_bsb'            -- AU-WA: Building Services Board contractor licence
);

CREATE TYPE licence_status AS ENUM ('active', 'expired', 'suspended', 'pending');

CREATE TABLE licences (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  holder_user_id    uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  licence_type      licence_type  NOT NULL,
  licence_number    text          NOT NULL,
  class_or_category text,
  issuing_body      text          NOT NULL,
  jurisdiction      text          NOT NULL,
  issued_at         date,
  expires_at        date,
  cpd_required      boolean       NOT NULL DEFAULT false,
  cpd_completed_at  date,
  status            licence_status NOT NULL DEFAULT 'active',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER licences_updated_at
  BEFORE UPDATE ON licences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes on foreign keys and common query patterns.
CREATE INDEX licences_org_id_idx        ON licences (org_id);
CREATE INDEX licences_holder_user_id_idx ON licences (holder_user_id);
CREATE INDEX licences_expires_at_idx    ON licences (expires_at);
CREATE INDEX licences_status_idx        ON licences (status);

ALTER TABLE licences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read ON licences
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_write ON licences
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_update ON licences
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_delete ON licences
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));
