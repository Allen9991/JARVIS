-- Migration: create users table
-- Mirrors auth.users (Supabase Auth) with application-level profile data.
-- The trigger below keeps this table in sync automatically.

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'advisor');

CREATE TABLE users (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  name       text,
  avatar_url text,
  role       user_role   NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-creates a users row when a new Supabase Auth user is registered.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- A user can always read their own profile row.
CREATE POLICY self_read ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- A user can update their own profile row.
CREATE POLICY user_update ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- INSERT is handled exclusively by the handle_new_auth_user() trigger (SECURITY DEFINER).
-- Direct inserts from authenticated clients are denied.

-- The co-member read policy (reading other users in shared orgs) depends on
-- org_memberships and is added at the end of migration 20260524120002.
