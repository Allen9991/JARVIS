-- Migration: create organisations table
-- Phase 0 foundation — first tenant-scoped table.
--
-- RLS DESIGN NOTE: The tenant-isolation policies for this table reference
-- org_memberships, which does not exist yet at this migration point.
-- Postgres validates USING/WITH CHECK expressions at parse time (not query time),
-- so those policies cannot be created here.
-- Full RLS for organisations (tenant_read, tenant_update) is applied at the end
-- of migration 20260524120002 once both org_memberships and auth_user_org_ids()
-- are in place. RLS is still ENABLED here so no unguarded window exists.

-- Auto-updates updated_at on any row modification.
-- Defined once here; reused by all subsequent tables via CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE organisations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  entity_type           text,
  industry              text,
  jurisdiction          text        NOT NULL,
  gst_registered        boolean     NOT NULL DEFAULT false,
  gst_number            text,
  abn                   text,
  nzbn                  text,
  staff_count           integer     NOT NULL DEFAULT 1,
  business_profile_json jsonb,
  voice_profile_json    jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create an organisation.
-- App code creates the owner membership in the same server transaction immediately after.
-- This is the only policy that can be added here; all other policies depend on
-- org_memberships which is created in migration 20260524120002.
CREATE POLICY org_create ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- tenant_read and tenant_update policies are added at the end of
-- migration 20260524120002 once org_memberships and auth_user_org_ids() exist.
