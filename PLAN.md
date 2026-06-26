# Atlas AI — Project Plan

> **Living document.** Updated as phases complete. Both agents and humans update this. The human owner approves phase transitions. Never skip a phase — each one is the foundation the next one stands on.

---

## How to Use This Document

- **Agents:** before starting any task, check this file. Work top-to-bottom within the current phase. Do not start Phase N+1 until Phase N is signed off by the human.
- **Human:** your job is to test the acceptance criteria for each phase, sign it off, and unblock agents when they're stuck.
- **Status markers:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (explain why below the item)

---

## Current Phase

> ### 🎯 PHASE 0 — Foundation
> **Owner:** Claude Code (backend) + Codex (frontend) in parallel
> **Target:** Weeks 1–2
> **Status:** NOT STARTED

---

## Phase 0 — Foundation

**Goal:** A deployable, empty shell. Auth works. Multi-tenancy works. CI/CD works. No business logic yet. Everything that comes later is built on this — if it's wrong here, it's wrong everywhere.

### 0.1 Repository Setup
**Owner: Codex**

- [x] Initialise Turborepo monorepo with `pnpm` workspaces
- [x] Create `apps/web`, `apps/ai-service`, `packages/db`, `packages/shared`, `packages/ui` directories
- [x] Configure `turbo.json` with build, dev, lint, test pipelines
- [x] Add `.gitignore` covering: `.env*`, `node_modules`, `.turbo`, `__pycache__`, `.pyc`, `dist`, `.next`
- [x] Add `.env.example` at repo root with every required variable and a one-line comment on each
- [x] Confirm `pnpm install` runs cleanly from root

**Acceptance:** `pnpm install && pnpm build` from repo root exits 0.

---

### 0.2 Database Schema & RLS
**Owner: Claude Code**

- [!] Create Supabase project in region `ap-southeast-2` (AWS Sydney) — **needs human action: create project at supabase.com**
- [!] Enable pgvector extension in Supabase — **needs human action: enable in Supabase dashboard after project created**
- [x] Write migration: `organisations` table (`supabase/migrations/20260524120000_create_organisations.sql`)
- [x] Write migration: `users` table (`supabase/migrations/20260524120001_create_users.sql`)
- [x] Write migration: `org_memberships` table (`supabase/migrations/20260524120002_create_org_memberships.sql`)
- [x] Write migration: `audit_log` table — append-only enforced at DB level (`supabase/migrations/20260524120003_create_audit_log.sql`)
- [x] Write migration: `licences` table (tradie vertical, in from day one) (`supabase/migrations/20260524120004_create_licences.sql`)
- [x] Write migration: `jobs` table (`supabase/migrations/20260524120005_create_jobs.sql`)
- [x] Write migration: `job_assignments` table (`supabase/migrations/20260524120006_create_job_assignments.sql`)
- [x] Write migration: `safety_documents` table (`supabase/migrations/20260524120007_create_safety_documents.sql`)
- [x] Write RLS policy for every tenant-scoped table (standard pattern from `ARCHITECTURE.md` §4)
- [x] Revoke `UPDATE` and `DELETE` on `audit_log` for ALL roles including `service_role` (triggers + REVOKE)
- [x] Add indexes on every foreign key column
- [x] Drizzle ORM schema in `packages/db` matches migrations exactly
- [x] Write seed script: one tradie test org (owner + apprentice, 2 NZ licences, 3 jobs) (`supabase/seed.sql`)
- [!] Run seed against local Supabase and verify all rows exist — **blocked on Supabase project creation**

**Acceptance:** Connect to Supabase as User A (org A). Attempt to query org B's data via direct DB call. Returns zero rows. `audit_log` rejects an `UPDATE` statement even from the service role.

---

### 0.3 Authentication
**Owner: Codex**

- [ ] Supabase Auth configured: email/password, magic link, Google OAuth
- [x] Sign up page (`/signup`) — email + password
- [x] Sign in page (`/login`) — email + password + magic link option
- [x] Google OAuth button wired to Supabase Auth
- [x] Post-signup flow: redirect to org creation if user has no org
- [x] Session handling: `auth.uid()` available in tRPC context on every request
- [x] Auth middleware protecting all `/dashboard/**` routes — redirect to `/login` if unauthenticated
- [x] Sign out button in dashboard header

**Acceptance:** Sign up with a new email. Create an org. Sign out. Sign back in. Land on dashboard. Entire flow under 60 seconds.

---

### 0.4 Multi-Tenancy & tRPC
**Owner: Codex (tRPC setup) + Claude Code (org membership logic)**

- [x] tRPC v11 initialised with type-safe context
- [ ] Context includes: `auth.uid()`, resolved `org_id`, Drizzle DB client
- [ ] `requireOrgMember(orgId)` helper implemented — throws if user is not a member of the org
- [x] `protectedProcedure` base procedure that enforces auth
- [ ] Organisation creation procedure: `org.create`
- [ ] Organisation invite procedure: `org.invite` — sends email via Resend, creates pending membership
- [ ] Accept invite procedure: `org.acceptInvite`
- [ ] Every tRPC procedure that touches tenant data calls `requireOrgMember` — CI grep enforces this

**Acceptance:** User A in Org A cannot call any `org.` procedure that returns Org B's data. CI grep for procedures missing `requireOrgMember` returns zero.

---

### 0.5 Dashboard Shell
**Owner: Codex**

- [x] App shell layout: sidebar + header + main content area
- [x] Sidebar nav with stub links for all pillars:
  - Inbox (Communication Hub)
  - Compliance (Compliance Guardian)
  - Jobs (Tradie job management)
  - Documents
  - Operations (Invoices, Quotes, Expenses)
  - Settings
- [ ] Header: org name, user avatar, sign out
- [x] Empty state for every stub page (not a blank white screen — a meaningful empty state with a short description of what will be here)
- [x] `/compliance/licences` page stub: shows empty licence list with "No licences added yet" state
- [ ] Responsive: works at 375px (mobile) and 1280px (desktop)
- [x] Dark mode support via Tailwind (shadcn default)

**Acceptance:** Every nav item navigates without a 404. Every page has a visible empty state. Looks correct on iPhone SE screen width (375px).

---

### 0.6 Python AI Service Skeleton
**Owner: Claude Code**

- [x] FastAPI app in `apps/ai-service/` (`api.py`, `config.py`)
- [x] `GET /health` returns `{"status": "ok", "version": "0.1.0", "service": "atlas-ai"}`
- [x] HMAC request verification middleware — `require_valid_signature` FastAPI dependency; unsigned requests return 401
- [x] LangGraph installed and a stub graph compiles without error (`agents/stub.py` — imported at startup)
- [x] Rules engine skeleton: `apps/ai-service/rules/engine.py` — empty rule registry, evaluation interface defined per `COMPLIANCE.md` §4, smoke tests in `tests/test_engine.py`
- [x] `pyproject.toml` with pinned versions (switched from `requirements.txt` per CONVENTIONS §8 — uv)
- [x] `Dockerfile` for Railway deployment
- [!] Deployed to Railway — public URL accessible — **needs human action: `railway up` from `apps/ai-service/`**

**Acceptance:** `curl https://your-railway-url/health` returns 200 with correct JSON. A signed request from `apps/web` reaches the AI service and passes HMAC verification. An unsigned request returns 401.

---

### 0.7 CI/CD Pipeline
**Owner: Codex**

- [x] GitHub Actions workflow: on every PR →
  - `pnpm lint` (ESLint + Prettier)
  - `pnpm typecheck` (tsc --noEmit)
  - `pnpm test` (Vitest unit tests)
  - `pnpm build` (must succeed)
  - Python: `ruff check`, `mypy --strict`, `pytest`
- [ ] Vercel connected to GitHub repo — auto-deploys `main` to production
- [ ] Preview deployments on every PR (Vercel default)
- [ ] Branch protection on `main`: require passing CI before merge
- [x] `pnpm typecheck` fails if any `// @ts-ignore` is found without a companion comment
- [ ] Secret scanning: CI fails if any string matching `sk-ant-`, `eyJ`, or `service_role` appears in committed files outside `.env.example`

**Acceptance:** Open a PR with a deliberate type error. CI fails. Fix it. CI passes. Merge. Vercel deploys. Visit the Vercel URL — dashboard loads.

---

### 0.8 Observability
**Owner: Claude Code (Axiom/Sentry setup) + Codex (integration into Next.js)**

- [ ] Sentry project created — Next.js SDK installed, source maps uploaded on deploy
- [ ] Sentry captures unhandled exceptions in both `apps/web` and `apps/ai-service`
- [ ] Axiom workspace created — structured logs from Python AI service flowing in
- [ ] Every tRPC procedure logs: procedure name, org_id (hashed), duration, success/error
- [ ] Every AI service request logs: endpoint, model used (if any), duration, status

**Acceptance:** Trigger a deliberate 500 error in the app. It appears in Sentry within 60 seconds. A request to the AI service appears in Axiom logs.

---

### ✅ Phase 0 Sign-Off Checklist (Human Reviews This)

Before moving to Phase 1, the human owner verifies:

- [ ] Sign up → create org → invite teammate → accept invite → all land on dashboard
- [ ] `audit_log` has entries for every action taken during the above flow
- [ ] Tenant isolation test: two separate browser sessions, two orgs — zero data leakage
- [ ] CI passes on a fresh PR with no code changes
- [ ] Vercel deploy is live and accessible
- [ ] Railway AI service health check returns 200
- [ ] Sentry receives a test error
- [ ] No secrets in the git history (`git log --all --full-diff -p | grep "sk-ant-"` returns nothing)

**Phase 0 sign-off date:** _______________

---

## Phase 1 — Business Brain MVP

**Goal:** The owner can onboard their business and Atlas "knows" them. Documents can be uploaded and searched. Not yet doing anything with that knowledge — just building the knowledge base.

**Owner:** Claude Code (AI extraction, embeddings, vector search) + Codex (onboarding UI, document upload UI, knowledge base UI)

**Prerequisite:** Phase 0 signed off.

**Target:** Weeks 3–5

### Tasks (detail added when Phase 0 is signed off)

- [ ] Conversational onboarding flow: guided chat where owner describes their business
- [ ] AI extracts structured data: industry, entity type, services, pricing, staff count, policies
- [ ] Business profile stored as structured JSON + embeddings in pgvector
- [ ] Document upload: PDF/DOCX parsing, chunking, embedding, storage
- [ ] Simple knowledge base query: "What's our refund policy?" answered from uploaded docs
- [ ] Dashboard: business profile card, document list, knowledge base search bar
- [ ] For tradies: guided licence entry (add your LBP/electrician/plumber licence manually before API integration)

**Acceptance criteria defined at Phase 0 sign-off.**

---

## Phase 2 — Communication Hub

**Goal:** Atlas reads emails, drafts replies in the owner's voice, and follows up on quotes and invoices automatically.

**Prerequisite:** Phase 1 signed off.

**Target:** Weeks 5–9

### Key tasks (high level)

- [ ] Nylas API integration: connect Gmail/Outlook
- [ ] Email classification pipeline (Haiku: enquiry / complaint / invoice / follow-up / spam / admin)
- [ ] Smart inbox UI with classified emails and priority indicators
- [ ] AI draft responses using Business Brain context (Sonnet)
- [ ] Voice matching: analyse sent emails, store style profile
- [ ] Follow-up engine: track outbound quotes/invoices, auto-draft reminders via Inngest cron
- [ ] Approval queue: all AI drafts require one-tap approval before sending

---

## Phase 3 — NZ Compliance Engine

**Goal:** Real-time compliance score with actionable audit results for NZ businesses. The tradie compliance features are the priority.

**Prerequisite:** Phase 1 signed off. (Runs in parallel with Phase 2.)

**Target:** Weeks 8–13

### Key tasks (high level)

- [ ] Rules engine core: jurisdiction-aware, version-dated, deterministic evaluation pipeline
- [ ] NZ tradie licensing rules: LBP, EWRB, PGDB, Site Safe, asbestos (see `COMPLIANCE.md` §8.4)
- [ ] NZ site safety rules: HSWA hazard register, SSSP, toolbox talks, incident reporting, notifiable work
- [ ] NZ building consent rules: consent required decision tree, LBP class matching, CCC checklist
- [ ] GST module: registration threshold, filing deadlines, return preparation
- [ ] Holidays Act module: OWP vs AWE calculations, leave balance tracking
- [ ] PAYE module: deduction verification, KiwiSaver, payday filing
- [ ] Privacy Act module: breach notification tracking
- [ ] Construction Contracts Act: payment claims, retention trust compliance
- [ ] Compliance Score algorithm (see `COMPLIANCE.md` §6)
- [ ] Compliance dashboard: heat map, score history, deadlines, remediation steps
- [ ] Audit trail: every rule evaluation logged with inputs, rule version, verdict

---

## Phase 4 — Operations Autopilot

**Goal:** Atlas generates invoices, quotes, and documents from natural language.

**Prerequisite:** Phase 2 signed off.

**Target:** Weeks 12–16

### Key tasks (high level)

- [ ] Invoice generator: natural language → structured invoice → GST calculation → PDF → send
- [ ] Quote builder: voice/text description → pulls pricing from Business Brain → PDF
- [ ] AI SWMS generator (AU prep): generates SWMS from job scope + deterministic safety rules
- [ ] AI Site Risk Scanner: address → building age, flood zone, seismic zone → pre-populated risk assessment
- [ ] Document templates: employment agreements, privacy policies, H&S plans (NZ-specific)
- [ ] Expense categorisation: receipt photo → OCR → IRD category → job attachment
- [ ] Xero integration (read-only first): pull financial data for compliance checks

---

## Phase 5 — AU Jurisdiction Pack

**Goal:** Atlas works for Australian trade businesses.

**Prerequisite:** Phase 3 signed off.

**Target:** Weeks 16–22

### Key tasks (high level)

- [ ] AU jurisdiction pack: GST 10%/BAS, STP Phase 2, super, state payroll tax
- [ ] AU tradie licensing: NSW Fair Trading, VBA, QBCC (with MFR rules), SA CBS, WA BSB
- [ ] AU WHS: HRCW detection, SWMS required rules, WHS Management Plan, HRWL verification
- [ ] AU Security of Payment Acts (state-varying)
- [ ] TPAR for building & construction industry
- [ ] Modern Awards engine: top 10 awards only (Building and Construction, Electrical, Plumbing first)
- [ ] MYOB integration (read-only)
- [ ] ATO API: ABN lookup

---

## Phase 6 — Mobile + Polish

**Goal:** Mobile app, advisor portal, production hardening.

**Prerequisite:** Phase 4 signed off.

**Target:** Weeks 20–26

### Key tasks (high level)

- [ ] React Native (Expo) mobile app: compliance score, inbox, voice commands, receipt scanning
- [ ] Offline-first: critical features work without cell coverage
- [ ] Advisor portal: read-only dashboard for accountants/lawyers with separate auth
- [ ] Compliance Time Machine: retroactive audit against historical rule versions
- [ ] Natural language command interface with voice input
- [ ] Performance optimisation, load testing, security audit (SOC 2 prep)
- [ ] Marketing site, docs, onboarding tutorial

---

## Dependency Map

```
Phase 0 (Foundation)
    │
    ├──► Phase 1 (Business Brain)
    │         │
    │         ├──► Phase 2 (Communication Hub) ──► Phase 4 (Operations)
    │         │                                          │
    │         └──► Phase 3 (NZ Compliance) ──────────────┤
    │                    │                               │
    │                    └──► Phase 5 (AU Pack)          │
    │                                                    │
    └────────────────────────────────────────────────────┴──► Phase 6 (Mobile + Polish)
```

Phases 2 and 3 run in parallel intentionally — independent workstreams.

---

## Decision Log

> Append-only. Human or agent adds an entry whenever a scope, tech, or priority decision is made.

| Date | Decision | Made by | Reason |
|---|---|---|---|
| 2026-05 | Tradie vertical first | Human | Highest compliance pain, clearest moat, underserved by existing tools |
| 2026-05 | NZ before AU | Human | Founder's market, simpler (no Modern Awards), faster to validate |
| 2026-05 | Monolith-first (2 services max) | Claude Code | Speed to ship; extract only with evidence of bottleneck |
| 2026-05 | Claude Code = AI/compliance/security; Codex = frontend/CRUD | Human + Claude | Plays to each agent's strengths |

---

## Blocked Items

> Current blockers. Remove when resolved.

*None currently.*

---

*Atlas AI · Plan v1.0 · May 2026 · Living Document — update as you go*
