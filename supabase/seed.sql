-- Seed: one tradie test organisation with realistic Phase 0 data.
--
-- Creates:
--   - Two auth users (owner + apprentice) with known UUIDs for deterministic testing
--   - One organisation: Kiwi Spark Electrical Ltd (NZ, GST-registered)
--   - Two memberships (owner role, member role)
--   - Two NZ licences (Registered Electrician + Site Safe Passport)
--   - Three jobs of varying scope and status
--   - Five job assignments across the three jobs
--
-- Run against a LOCAL Supabase instance only.
-- Production data is never seeded via script — use the application onboarding flow.

DO $$
DECLARE
  v_owner_id      uuid := '00000000-0000-0000-0000-000000000002';
  v_apprentice_id uuid := '00000000-0000-0000-0000-000000000003';
  v_org_id        uuid := '00000000-0000-0000-0000-000000000001';
  v_job1_id       uuid := '00000000-0000-0000-0000-000000000010';
  v_job2_id       uuid := '00000000-0000-0000-0000-000000000011';
  v_job3_id       uuid := '00000000-0000-0000-0000-000000000012';
BEGIN

  -- ── Auth users ────────────────────────────────────────────────────────────
  -- These rows go into Supabase Auth's schema. On a local instance we have
  -- direct access; the handle_new_auth_user() trigger will create the
  -- corresponding users rows automatically.
  INSERT INTO auth.users (
    id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  ) VALUES
    (
      v_owner_id,
      'jamie.sparks@example.com',
      crypt('TestPassword123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Jamie Sparks"}',
      'authenticated', 'authenticated'
    ),
    (
      v_apprentice_id,
      'alex.wire@example.com',
      crypt('TestPassword123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Alex Wire"}',
      'authenticated', 'authenticated'
    )
  ON CONFLICT (id) DO NOTHING;

  -- The trigger handle_new_auth_user() creates users rows, but we upsert here
  -- to make the seed idempotent if the trigger already ran.
  INSERT INTO users (id, email, name)
  VALUES
    (v_owner_id,      'jamie.sparks@example.com', 'Jamie Sparks'),
    (v_apprentice_id, 'alex.wire@example.com',    'Alex Wire')
  ON CONFLICT (id) DO NOTHING;

  -- ── Organisation ──────────────────────────────────────────────────────────
  INSERT INTO organisations (
    id, name, entity_type, industry,
    jurisdiction, gst_registered, nzbn, staff_count
  ) VALUES (
    v_org_id,
    'Kiwi Spark Electrical Ltd',
    'limited_company',
    'electrical',
    'NZ',
    true,
    '9429123456789',
    2
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Memberships ───────────────────────────────────────────────────────────
  INSERT INTO org_memberships (user_id, org_id, role, invited_at, accepted_at)
  VALUES
    (v_owner_id,      v_org_id, 'owner',  now(), now()),
    (v_apprentice_id, v_org_id, 'member', now(), now())
  ON CONFLICT DO NOTHING;

  -- ── Licences (2 NZ licences held by the owner) ────────────────────────────
  INSERT INTO licences (
    id, org_id, holder_user_id,
    licence_type, licence_number, class_or_category,
    issuing_body, jurisdiction,
    issued_at, expires_at,
    cpd_required, status
  ) VALUES
    (
      gen_random_uuid(), v_org_id, v_owner_id,
      'electrician', 'EWRB-123456', 'Registered Electrician',
      'EWRB', 'NZ',
      '2024-01-15', '2026-01-15',
      true, 'active'
    ),
    (
      gen_random_uuid(), v_org_id, v_owner_id,
      'site_safe', 'SS-789012', 'Site Safe Passport',
      'Site Safe NZ', 'NZ',
      '2023-06-01', '2028-06-01',
      false, 'active'
    );

  -- ── Jobs (3 jobs of varying scope) ───────────────────────────────────────
  INSERT INTO jobs (
    id, org_id,
    address, scope_description,
    building_age, building_consent_required, consent_status,
    start_date, status
  ) VALUES
    (
      v_job1_id, v_org_id,
      '12 Lambton Quay, Wellington 6011',
      'Install new switchboard and rewire kitchen circuits',
      1985, false, 'not_required',
      '2026-06-01', 'active'
    ),
    (
      v_job2_id, v_org_id,
      '45 Queen Street, Auckland 1010',
      'Full residential rewire and solar panel installation with battery system',
      2001, true, 'pending',
      '2026-06-15', 'active'
    ),
    (
      v_job3_id, v_org_id,
      '8 Industrial Place, Christchurch 8024',
      'Commercial three-phase power upgrade for manufacturing equipment',
      1972, true, 'granted',
      '2026-07-01', 'draft'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ── Job assignments ───────────────────────────────────────────────────────
  INSERT INTO job_assignments (job_id, user_id, role, scheduled_for)
  VALUES
    (v_job1_id, v_owner_id,      'lead',       '2026-06-01'),
    (v_job1_id, v_apprentice_id, 'apprentice',  '2026-06-01'),
    (v_job2_id, v_owner_id,      'lead',       '2026-06-15'),
    (v_job3_id, v_owner_id,      'lead',       '2026-07-01'),
    (v_job3_id, v_apprentice_id, 'apprentice',  '2026-07-01')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete: org=%, owner=%, apprentice=%',
    v_org_id, v_owner_id, v_apprentice_id;

END;
$$;
