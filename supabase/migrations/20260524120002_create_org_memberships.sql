-- Migration: create org_memberships table
-- Links users to organisations with a role.
-- Also creates auth_user_org_ids(), the security-definer helper used by all
-- subsequent tenant-isolation RLS policies to avoid infinite recursion.

CREATE TABLE org_memberships (
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'member',
  invited_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  PRIMARY KEY (user_id, org_id)
);

-- Indexes on foreign keys (Postgres does not add these automatically).
CREATE INDEX org_memberships_user_id_idx ON org_memberships (user_id);
CREATE INDEX org_memberships_org_id_idx  ON org_memberships (org_id);

-- Returns the set of org IDs the calling user belongs to.
-- SECURITY DEFINER + STABLE lets this bypass RLS when called inside other
-- RLS policies, which prevents the circular-reference / infinite-recursion
-- problem that arises when org_memberships policies reference org_memberships.
CREATE OR REPLACE FUNCTION auth_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT org_id FROM org_memberships WHERE user_id = auth.uid();
$$;

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- Members can read the full membership list for orgs they belong to.
CREATE POLICY tenant_read ON org_memberships
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

-- INSERT / UPDATE / DELETE on memberships is performed server-side with the
-- Supabase service role key (invite flow, role changes, removals).
-- No permissive policies for writes means authenticated clients cannot modify
-- memberships directly — only the server can.

-- ── Deferred RLS for organisations and users ─────────────────────────────────
-- These policies were deferred from migrations 20260524120000 and 20260524120001
-- because they reference org_memberships and auth_user_org_ids(), which were not
-- available at those earlier migration points.

-- organisations: members can read and update only their own org.
CREATE POLICY tenant_read ON organisations
  FOR SELECT TO authenticated
  USING (id IN (SELECT auth_user_org_ids()));

CREATE POLICY tenant_update ON organisations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT auth_user_org_ids()));

-- users: members can read the profiles of anyone in a shared org.
CREATE POLICY org_member_read ON users
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT m2.user_id
      FROM org_memberships m1
      JOIN org_memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
    )
  );
