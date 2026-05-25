# Atlas AI — Architecture

> Read `PROJECT.md` first. This file is for **how** we build, not **what** or **why**.

---

## 1. Stack Decisions

### 1.1 The Golden Rule

**Managed services first.** Every hour spent configuring Kubernetes, managing Postgres backups, or debugging Redis cluster topology is an hour not spent on product. The stack optimises for three things: **speed to ship**, **operational simplicity**, **ability to scale to 1,000+ tenants without a rewrite**.

### 1.2 The Stack

| Layer | Technology | Why this, not that |
|---|---|---|
| Frontend (web) | **Next.js 15** (App Router) on Vercel | Server components reduce client JS. Vercel's edge gives <100ms TTFB globally. Pro plan ~$20/mo. We need SSR for marketing pages and API routes for webhooks. |
| Frontend (mobile) | **React Native (Expo)** | Phase 6 only. Share business logic with web. Expo managed workflow = no Xcode/Android Studio for 90% of features. |
| API layer | **Next.js API routes + tRPC** | End-to-end type safety, zero codegen. One deployment, one repo, one CI pipeline. **Do not** build a separate FastAPI backend for general API — only the AI service is Python. |
| Background jobs | **Inngest** | Serverless queues. Replaces Celery + Redis + worker servers. Handles retries, cron, fan-out, step functions. Free under 50K events/mo. |
| Database | **Supabase (PostgreSQL 16)** | Managed Postgres with built-in auth, RLS, realtime, **pgvector**. Pro plan ~$25/mo. Relational integrity is non-negotiable for compliance. |
| Vector search | **pgvector** (inside Supabase) | No separate vector DB. One connection pool, one backup. |
| Cache | **Upstash Redis** (serverless) | Pay-per-request. Use for: rate limiting, session tokens, compliance score caching. |
| Object storage | **Supabase Storage** (S3-compatible) | Documents, generated PDFs, receipt images. Included in Supabase plan. |
| AI orchestration | **LangGraph** (Python) | Production standard for stateful AI agents. Built-in checkpointing, human-in-the-loop, audit trails. Runs as separate service on Railway (~$10/mo). |
| LLM provider | **Claude API (Anthropic)** | Haiku 4.5 for routing/classification, Sonnet 4.6 for drafting/analysis. **Use prompt caching aggressively** — 90% savings on system prompts. Do not use Opus unless reasoning depth is genuinely required. |
| Rules engine | **Custom Python + JSON rule definitions** | Not OPA (infra policy tool). Not Drools (heavy, JVM). Our rules need effective dates, jurisdiction scoping, math. See `COMPLIANCE.md`. |
| Email integration | **Nylas API** | Unified Gmail + Outlook + Exchange. Handles OAuth, webhooks, incremental sync. Building raw integrations consumes months. |
| Transactional email | **Resend** | For sending invoices, reminders, notifications. Free under 100/day, $20/mo for 50K. |
| Auth | **Supabase Auth** | Email/password + Google OAuth + magic links. RLS tied to `auth.uid()`. Do not add Auth0/Clerk. |
| Monitoring | **Sentry** (errors) + **Axiom** (logs) | Free tiers sufficient for early stage. Add Datadog only when infra spend >$5K/mo. |
| CI/CD | **GitHub Actions** | Free for public repos, 2K min/mo for private. Vercel auto-deploys on push. Main = production, PR = preview. |

### 1.3 Monolith-First Principle

**Two services.** That's the entire production deployment:

1. **`apps/web`** — Next.js (Vercel). Hosts the UI, tRPC API, webhook handlers, and lightweight server logic.
2. **`apps/ai-service`** — Python FastAPI + LangGraph (Railway). Hosts the AI agents, prompt orchestration, and the compliance rules engine.

**One database** (Supabase). **One repo** (Turborepo monorepo).

Extract more services **only with empirical evidence of a bottleneck**. Every premature service boundary is a distributed-systems problem we don't need yet.

---

## 2. Phase Roadmap

> **Current phase: Phase 0.** See `PROJECT.md` §7 for current acceptance criteria.

| Phase | Weeks | Deliverable | Vibe-code leverage | Risk | Key dependency |
|---|---|---|---|---|---|
| **0: Foundation** | 1–2 | Auth, multi-tenancy, deploys | Very high (90%) | Low | None |
| **1: Business Brain MVP** | 3–5 | Onboarding, document indexing, KB search | High (70%) | Low | Supabase + pgvector |
| **2: Communication Hub** | 5–9 | Nylas, classified inbox, AI drafts, follow-ups | Medium (50%) | High | Nylas + email edge cases |
| **3: NZ Compliance Engine** | 8–13 | Rules engine, GST/Holidays/PAYE/Privacy modules, Score | Low (25%) | Very high | Legislation accuracy |
| **4: Operations Autopilot** | 12–16 | Invoice/quote generation, doc templates, OCR, Xero | High (65%) | Medium | Xero API |
| **5: AU Jurisdiction Pack** | 16–22 | GST/BAS, STP, Modern Awards top 10, super, state payroll, MYOB | Low (20%) | Very high | Modern Awards complexity |
| **6: Mobile + Polish** | 20–26 | React Native app, advisor portal, Time Machine, voice, hardening | High (70%) | Medium | RN learning curve |

**Phases 2 and 3 overlap intentionally.** Communication and compliance are independent workstreams — work on compliance rules (deterministic, testable) when you need a break from integration debugging (async, flaky).

---

## 3. Repository Structure

Monorepo using **Turborepo**. Two deployable services, shared packages, one source of truth.

```
atlas/
├─ apps/
│  ├─ web/                          # Next.js 15 (Vercel)            [CODEX OWNS]
│  │  ├─ app/
│  │  │  ├─ (auth)/                 # Login, signup, onboarding
│  │  │  ├─ (dashboard)/            # Main app shell
│  │  │  │  ├─ inbox/               # Smart email inbox
│  │  │  │  ├─ compliance/          # Score, heat map, audits
│  │  │  │  ├─ documents/           # Generated docs, templates
│  │  │  │  ├─ operations/          # Invoices, quotes, expenses
│  │  │  │  ├─ jobs/                # Tradie job management
│  │  │  │  └─ settings/            # Business profile, integrations
│  │  │  └─ (advisor)/              # Advisor portal (separate layout)
│  │  ├─ server/                    # tRPC routers
│  │  └─ lib/                       # Client utilities
│  │
│  ├─ ai-service/                   # Python LangGraph + FastAPI     [CLAUDE OWNS]
│  │  ├─ agents/                    # LangGraph agent graphs
│  │  │  ├─ communication/          # Email classify, draft, follow-up
│  │  │  ├─ compliance/             # Audit orchestration
│  │  │  ├─ operations/             # Invoice, quote generation
│  │  │  └─ onboarding/             # Business profile extraction
│  │  ├─ rules/                     # Compliance rules engine
│  │  │  ├─ engine.py               # Core evaluation engine
│  │  │  ├─ nz/                     # NZ jurisdiction rules (JSON)
│  │  │  └─ au/                     # AU jurisdiction rules (JSON)
│  │  ├─ prompts/                   # All LLM prompt templates
│  │  │  ├─ classification/
│  │  │  ├─ drafting/
│  │  │  └─ extraction/
│  │  ├─ retrieval/                 # pgvector queries, context assembly
│  │  └─ api.py                     # FastAPI endpoints
│  │
│  └─ mobile/                       # React Native (Expo)            [PHASE 6 — CODEX OWNS]
│
├─ packages/
│  ├─ db/                           # Drizzle ORM schema + migrations [CLAUDE OWNS]
│  ├─ shared/                       # Shared TS types, constants     [SHARED]
│  └─ ui/                           # Shared UI components            [CODEX OWNS]
│
├─ supabase/                        # Supabase config, RLS policies, seeds [CLAUDE OWNS]
│  ├─ migrations/
│  ├─ policies/
│  └─ seed.sql
│
├─ docs/
│  ├─ PROJECT.md
│  ├─ ARCHITECTURE.md               (this file)
│  ├─ COMPLIANCE.md
│  ├─ CLAUDE.md
│  ├─ CODEX.md
│  └─ CONVENTIONS.md
│
└─ turbo.json
```

---

## 4. Multi-Tenancy

**Shared database, row-level security (RLS).** Not separate databases per tenant.

Every tenant-scoped table has an `org_id` column. Every row-level security policy follows the same shape:

```sql
CREATE POLICY tenant_isolation ON {table_name}
  FOR ALL
  USING (
    org_id = (
      SELECT org_id
      FROM org_memberships
      WHERE user_id = auth.uid()
    )
  );
```

This guarantees no cross-tenant leakage at the database layer, even if application code has bugs. **Service role key is server-side only**, never exposed to the client.

---

## 5. Core Database Schema

Drizzle ORM in `packages/db`. Migrations live in `supabase/migrations`. Append, never edit existing migrations.

### 5.1 Organisations & users

```ts
organisations (
  id, name, entity_type, industry, jurisdiction,
  gst_registered, gst_number, abn, nzbn, staff_count,
  business_profile_json, voice_profile_json,
  created_at, updated_at
)

users (
  id,                  -- == supabase auth.uid()
  email, name, avatar_url,
  role                 -- owner | admin | member | advisor
)

org_memberships (
  user_id, org_id, role,
  invited_at, accepted_at
)
```

### 5.2 Business knowledge

```ts
documents (
  id, org_id, filename, file_url, doc_type,
  parsed_text, chunk_count, uploaded_at
)

document_chunks (
  id, document_id, org_id,
  chunk_text,
  embedding vector(1536),    -- pgvector
  chunk_index
)
```

### 5.3 Communications

```ts
emails (
  id, org_id, nylas_id, thread_id, subject,
  sender, recipients, body_preview,
  classification, urgency, sentiment,
  requires_response, ai_draft_id, status,
  received_at
)

email_drafts (
  id, org_id, email_id, body,
  prompt_version, model_used, confidence,
  approved_at, sent_at, edited_by_user
)
```

### 5.4 Compliance

```ts
compliance_rules (
  id, rule_id,               -- e.g. "nz.gst.registration_threshold"
  jurisdiction, category, version,
  effective_from, effective_to, severity,
  definition_json, test_cases_json
)

compliance_evaluations (
  id, org_id, rule_id, rule_version,
  evaluation_date,
  input_data_json, verdict, score,
  message, remediation,
  evaluated_by               -- system | manual
)

compliance_scores (
  id, org_id, score, breakdown_json,
  evaluated_at,
  rule_count, compliant_count,
  non_compliant_count, insufficient_data_count
)
```

### 5.5 Audit trail

```ts
audit_log (
  id, org_id, user_id, action,
  entity_type, entity_id, details_json,
  ai_model_used, prompt_version,
  created_at                 -- APPEND-ONLY: no UPDATE, no DELETE
)
```

**`audit_log` is append-only.** Database role permissions deny `UPDATE` and `DELETE`. This is the legal foundation of the product. See `COMPLIANCE.md` §3.

### 5.6 Tradie-specific tables (Phase 0 includes these)

Because tradies are the launch vertical, the schema includes trade-specific tables from day one:

```ts
licences (
  id, org_id, holder_user_id,
  licence_type,              -- lbp | electrician | plumber | gasfitter | drainlayer | qbcc | nsw_fair_trading | ...
  licence_number, class_or_category,
  issuing_body, jurisdiction,
  issued_at, expires_at,
  cpd_required, cpd_completed_at,
  status                     -- active | expired | suspended | pending
)

jobs (
  id, org_id, client_id,
  address, scope_description,
  building_age, building_consent_required,
  consent_status,            -- not_required | exempt | pending | granted | declined
  hrcw_categories text[],    -- AU: High Risk Construction Work flags
  start_date, status
)

job_assignments (
  job_id, user_id, role,     -- lead | apprentice | supervisor | subbie
  scheduled_for, hours_logged
)

safety_documents (
  id, org_id, job_id,
  doc_type,                  -- sssp | swms | hazard_register | toolbox_talk | jsa
  generated_by_ai, content_json, pdf_url,
  approved_at, expires_at
)
```

---

## 6. AI Architecture (LangGraph)

### 6.1 Three core patterns

| Pattern | Used for | Flow |
|---|---|---|
| **Classify → Route → Act → Verify** | Communication hub | Email arrives → Haiku classifies → routed to handler → gather context → Sonnet drafts → approval queue |
| **Gather → Evaluate → Score → Explain** | Compliance audits | Pull data (Xero/MYOB/DB) → run deterministic rules → compute score → Sonnet explains in plain English |
| **Converse → Extract → Validate → Act** | Natural language commands | User speaks → intent + entity extraction → validation → execute or ask clarifier |

### 6.2 Human-in-the-loop gates

Every LangGraph graph has explicit checkpoints where execution **pauses** for human approval:

- **Email sending** — draft queued, owner approves or edits, then sent via Nylas
- **Document generation** — invoice/quote generated, owner reviews PDF, then sends/downloads
- **Compliance actions** — GST return drafted, owner reviews every line, then confirms
- **Autopilot rules** — even in Autopilot mode, actions over the configured risk threshold pause for approval

### 6.3 Model routing

| Task | Model | Cost/call (est.) | Latency target | Caching |
|---|---|---|---|---|
| Email classification | Haiku 4.5 | $0.001 | <500ms | None (unique inputs) |
| Email draft | Sonnet 4.6 | $0.008 | <3s | System prompt cached |
| Follow-up generation | Sonnet 4.6 | $0.006 | <3s | System + business cached |
| Compliance explanation | Sonnet 4.6 | $0.010 | <5s | System + jurisdiction cached |
| Document generation | Sonnet 4.6 | $0.015 | <5s | Template cached |
| Natural language command | Haiku (intent) + Sonnet (action) | $0.005 | <2s | System cached |
| Voice analysis | Sonnet 4.6 | $0.050 | n/a (one-time) | None |
| Business profile extraction | Sonnet 4.6 | $0.020 | n/a (onboarding) | None |

**Never hardcode model names.** Use a model router that maps `task_type → model`. Lets us switch `email_classify` from Haiku to a fine-tuned model without touching application code.

### 6.4 Prompt hierarchy

Every LLM call uses a **four-layer prompt structure**:

| Layer | Purpose | Changes how often |
|---|---|---|
| **1. System identity** | Who Atlas is, core personality, safety rails, output format | Rarely (monthly) |
| **2. Jurisdiction context** | Country regs, terminology, rates in effect | When regulations change |
| **3. Business context** | Everything Atlas knows about this specific business | Every session (dynamic) |
| **4. Task instruction** | What to do right now | Every request |

Layers 1–3 are cached. Pay full price only for layer 4. **At 90% cache hit rate, this cuts input token costs by 9x.**

Full prompt templates live in `apps/ai-service/prompts/` with semantic versioning (e.g. `email_classify_v2.3.txt`).

---

## 7. Security Architecture

Compliance software has a higher security bar than typical SaaS. Customers' financial data, employee info, and tax records are the highest-value targets an attacker could want.

**Data isolation**
- RLS on every tenant-scoped table
- Supabase service role key in server-side code only — never the client bundle
- Every tRPC procedure validates org membership before any data access

**Encryption**
- TLS 1.3 everywhere (Vercel + Supabase default)
- AES-256 at rest (Supabase default)
- Sensitive fields (tax numbers, employee salaries) **encrypted at the application layer** before storage — envelope encryption with Supabase Vault

**API key management**
- LLM API keys in Vercel/Railway environment variables, never in code
- Nylas/Xero OAuth tokens stored encrypted in DB, rotated on schedule
- No API keys in client-side code — all external API calls go through server routes

**AI-specific security**
- **Prompt injection defence:** user-provided content (emails, documents) always placed in clearly delimited data blocks, never mixed with system instructions
- **Output filtering:** all LLM outputs validated against expected schemas before being shown to users or used in actions
- **No customer data used for training** — Anthropic's API terms guarantee this; we communicate it prominently

**Audit and compliance**
- `audit_log` is immutable — no `UPDATE` or `DELETE` permissions, even for admins
- All authentication events logged
- Data access logs retained for 7 years (NZ IRD requirement)
- SOC 2 Type II preparation from Phase 4 onward — design controls now, certify later

---

## 8. Architectural Decision Log

> Append-only. Every new entry must include: decision, alternatives, reasoning, date, author.

| Date | Decision | Chosen | Rejected | Reasoning |
|---|---|---|---|---|
| 2026-05 | Backend framework | Next.js API routes + tRPC | Separate FastAPI for all backend | Monolith-first. One deployment, one repo, end-to-end type safety. Extract Python service only for AI workloads. |
| 2026-05 | Database | Supabase (PostgreSQL) | PlanetScale (MySQL), Firebase | Compliance needs relational integrity. RLS for multi-tenancy. pgvector eliminates separate vector DB. Firebase lacks joins. |
| 2026-05 | AI orchestration | LangGraph | CrewAI, raw API calls | Production standard for stateful agents. Checkpointing, HITL, audit trails built in. CrewAI easier but lacks production controls. |
| 2026-05 | Rules engine | Custom Python + JSON rules | OPA (Rego), Drools | OPA is for infra policy. Drools is heavy and JVM. Custom engine gives us effective dates, jurisdiction scoping, and math that OPA can't do natively. |
| 2026-05 | Email integration | Nylas API | Raw Gmail/Outlook APIs | Nylas abstracts OAuth, incremental sync, edge cases. Raw integrations would consume 3+ months. |
| 2026-05 | Background jobs | Inngest | Celery + Redis, Temporal | Inngest is serverless, on Vercel infra, handles retries/cron. Temporal is right at 50+ engineers. Celery needs worker servers. |
| 2026-05 | Hosting | Vercel + Railway | AWS (ECS/Lambda), Render | Vercel for frontend + API (zero-config Next.js). Railway for Python AI service. AWS cheaper at scale but operational overhead high for small team. |
| 2026-05 | Multi-tenancy | Shared DB with RLS | Separate DBs per tenant | Shared DB is simpler to manage, migrate, backup. RLS provides equivalent isolation. Separate DBs only make sense at 1000+ tenants or for enterprise compliance. |
| 2026-05 | Agent split | Claude Code → AI/compliance/security; Codex → frontend/CRUD/tests | Both agents full-stack | Claude stronger on long-context reasoning, deterministic logic, security. Codex faster on scaffolding, UI iteration, glue code. |

---

## 9. What to Build Next (Phase 0 Checklist)

This is the working task list for Phase 0. Cross items off as completed. Both agents pull from this list.

**Infrastructure (Claude Code)**
- [ ] Supabase project created (NZ region: AWS Sydney `ap-southeast-2`)
- [ ] Initial migration: `organisations`, `users`, `org_memberships`, `audit_log`
- [ ] RLS policies on every tenant-scoped table
- [ ] `audit_log` permissions: `INSERT` only, no `UPDATE`/`DELETE` for any role
- [ ] Railway project for Python AI service
- [ ] FastAPI `/health` endpoint returns 200 with service version
- [ ] Environment variable strategy documented (`.env.example` in repo root)

**Frontend (Codex)**
- [ ] Turborepo monorepo initialised
- [ ] Next.js 15 (App Router) in `apps/web`
- [ ] Tailwind + shadcn/ui installed and configured
- [ ] tRPC set up with type-safe context including `auth.uid()` and `org_id`
- [ ] Sign up / sign in / magic link flows wired to Supabase Auth
- [ ] Organisation creation flow (post-signup)
- [ ] Invite teammate by email (with role selector)
- [ ] Empty dashboard shell with sidebar nav stubs for each pillar
- [ ] CI: lint + typecheck + test on every PR; deploy to Vercel on merge

**Shared / coordination**
- [ ] `packages/db` Drizzle schema matches Supabase migrations
- [ ] `packages/shared` exports `OrgRole`, `LicenceType`, jurisdiction enums
- [ ] Seed script creates a tradie test org with: 1 owner, 1 apprentice, 2 licences, 3 jobs

---

*Atlas AI · Architecture v1.0 · May 2026 · Confidential*
