# Atlas AI — Conventions

> The rules of the road. Both agents and humans follow these.

---

## 1. Languages & Versions

| Layer | Language | Version |
|---|---|---|
| Web frontend + API | TypeScript | 5.4+ (strict mode, no `any`) |
| AI service | Python | 3.12+ |
| Database | SQL (Postgres flavour) | PostgreSQL 16 |
| Schema definition | Drizzle ORM (TS) | Latest stable |
| Rule definitions | JSON | — |
| Migrations | SQL | Supabase migration format |

**TypeScript:** `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitAny": true`. No `// @ts-ignore` without a comment explaining why.

**Python:** type hints everywhere. Pydantic models for all structured data. `ruff` for linting, `black` for formatting, `mypy --strict` in CI.

---

## 2. Naming Conventions

### 2.1 Files

| Type | Convention | Example |
|---|---|---|
| React components | `PascalCase.tsx` | `ComplianceScoreCard.tsx` |
| Hooks | `useCamelCase.ts` | `useOrgMembership.ts` |
| tRPC routers | `camelCase.router.ts` | `compliance.router.ts` |
| Utilities | `camelCase.ts` | `formatGstNumber.ts` |
| Python modules | `snake_case.py` | `swms_generator.py` |
| Prompt templates | `snake_case_v{semver}.txt` | `email_classify_v2.3.txt` |
| Rule definitions | `{rule_id}.json` | `nz.gst.registration_threshold.json` |
| Migrations | `{timestamp}_{snake_case}.sql` | `20260524120000_add_licences_table.sql` |

### 2.2 Database

- Tables: `snake_case`, **plural** (`organisations`, `compliance_evaluations`)
- Columns: `snake_case` (`org_id`, `evaluated_at`)
- Foreign keys: `{singular_table}_id` (`organisation_id` → but we use `org_id` for brevity; that's the one exception)
- Timestamps: always `_at` suffix (`created_at`, `expires_at`)
- Booleans: `is_` or `has_` prefix (`is_gst_registered`, `has_consent`)

### 2.3 Rules

`{jurisdiction}.{category}.{specific_name}` — see `COMPLIANCE.md` §2.

### 2.4 Environment variables

`SCREAMING_SNAKE_CASE`, prefixed by service:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NYLAS_API_KEY`, `NYLAS_CLIENT_ID`
- `RESEND_API_KEY`
- `AI_SERVICE_URL` (the Next.js app's pointer to the Python service)
- `AI_SERVICE_SHARED_SECRET` (HMAC for inter-service calls)

Every env var must appear in `.env.example` with a placeholder value and a one-line comment.

---

## 3. Git Workflow

### 3.1 Branches

- `main` → production. Protected. Merges only via PR with passing CI.
- `feat/{short-name}` → feature branches (`feat/compliance-score`, `feat/lbp-expiry-rule`)
- `fix/{short-name}` → bug fixes
- `chore/{short-name}` → tooling, deps, docs

**One branch per logical change.** Don't pile features into one branch.

### 3.2 Commits

Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.

Examples:

```
feat(compliance): add nz.gst.registration_threshold rule

Implements rule §2 from COMPLIANCE.md. Includes test cases for all four
verdict paths and the boundary case (turnover == $60K exactly).

Refs: PROJECT.md Phase 3
```

```
fix(auth): prevent cross-org access in inbox query

The tRPC inbox.list procedure was missing the org_id filter, allowing
a user belonging to multiple orgs to see emails from any of them.
Added explicit filter + regression test.

Security-relevant. Reviewed by Claude Code.
```

### 3.3 Pull Requests

Every PR must include:

1. **What** — one paragraph: what changed and why
2. **Phase / area** — `Phase 0 / Foundation` or `Phase 3 / NZ Compliance — GST module`
3. **Agent** — `Authored by Claude Code` or `Authored by Codex` (or human name)
4. **Schema impact** — yes/no; if yes, link the migration
5. **Security impact** — yes/no; if yes, what changed
6. **Test coverage** — what was tested and how
7. **Screenshots / GIFs** — for any UI change

PR title format: `[Phase N] feat(scope): subject` — e.g. `[Phase 0] feat(db): add audit_log table with append-only enforcement`.

### 3.4 Merge strategy

**Squash merge** for feature branches. The PR title becomes the squash commit subject.

---

## 4. Agent Coordination

Two AI agents touching one codebase needs discipline. Rules:

### 4.1 Ownership boundaries

| Area | Owner | Other agent role |
|---|---|---|
| `apps/web/**` | Codex | Review only — Claude doesn't edit unless invited |
| `apps/ai-service/**` | Claude Code | Codex doesn't edit |
| `apps/ai-service/rules/**` | Claude Code | Locked — Codex never edits rules |
| `apps/mobile/**` (Phase 6) | Codex | — |
| `packages/db/**` | Claude Code | Codex can read; schema changes go through Claude |
| `packages/shared/**` | Shared | Either agent edits; flag the other agent in PR description |
| `packages/ui/**` | Codex | Claude reviews UI components used in compliance/AI flows |
| `supabase/migrations/**` | Claude Code | Locked — Codex never writes migrations |
| `supabase/policies/**` | Claude Code | Locked — RLS is security-sensitive |
| `docs/**` | Shared | Either agent updates; ADR entries go in `ARCHITECTURE.md` §8 |

### 4.2 Handoff protocol

When one agent needs the other to do something:

1. Open a PR with the scaffolding/skeleton/interface
2. In the PR description, write: `@codex: please implement the UI for this endpoint` (or `@claude-code: please review the security boundaries here`)
3. Tag with the `handoff-needed` label
4. The other agent picks up in a follow-up PR

Don't ping-pong inside the same PR — it makes the diff impossible to review.

### 4.3 When to escalate to a human

Either agent **stops and asks** if:

- A compliance rule's expected verdict is ambiguous from the legislation
- A security trade-off has no clear winner
- A schema change would require backfilling existing tenant data
- The product behaviour described in `PROJECT.md` is internally contradictory
- A third-party API has behaviour that contradicts its docs

---

## 5. Code Style Specifics

### 5.1 TypeScript (Next.js / tRPC)

- **One concern per file.** Components shouldn't fetch data directly — use hooks. Hooks shouldn't contain JSX.
- **Server components by default.** Add `"use client"` only when interactivity demands it.
- **tRPC procedures must validate input with Zod.** No raw `any` going into a query.
- **Every protected procedure must call `ctx.requireOrgMember(orgId)`** — there is one helper, and every guarded path uses it.
- **No fetch from the client to Supabase with the service role key.** Ever. CI grep for `SERVICE_ROLE` in `apps/web/lib/` should match zero files.

### 5.2 Python (AI service)

- **Pydantic for every structured input and output.** LLM outputs are validated before being used.
- **Prompts live in `apps/ai-service/prompts/` as files**, not inline strings. Loaded by version.
- **Every LLM call logs:** prompt version, model used, token counts, latency, request id. Goes into `audit_log` if the call influenced any tenant-visible output.
- **No bare `except:`** — always catch a specific exception.
- **Async everywhere I/O happens** — `httpx.AsyncClient`, not `requests`.

### 5.3 SQL

- **One migration per logical change.** Don't bundle "add table" + "add index" + "add column to other table" into one migration.
- **Migrations are append-only.** Never edit a committed migration. If you got it wrong, write a new migration to fix it.
- **Every tenant-scoped table needs an RLS policy in the same migration**, not a follow-up.
- **Index every foreign key** — Postgres doesn't do this automatically.

---

## 6. Testing

| Layer | Framework | Where | Required coverage |
|---|---|---|---|
| TS unit | Vitest | `apps/web/**/*.test.ts` | Business logic, formatters, utils |
| TS component | Vitest + Testing Library | `apps/web/**/*.test.tsx` | All shadcn-derived components with logic |
| TS e2e | Playwright | `apps/web/e2e/` | Critical user flows: signup, org create, invite |
| Python unit | pytest | `apps/ai-service/tests/` | Rules engine, retrieval, prompt assembly |
| Rule cases | pytest + `test_cases_json` | Auto-generated from rule JSON | **Every rule must pass 100% of its test cases** |
| Integration | pytest + httpx | `apps/ai-service/tests/integration/` | LangGraph agent flows end-to-end with mocked LLM |

**CI runs all of the above on every PR.** Below thresholds:
- TS coverage: 70% line, 80% on `lib/` and `server/`
- Python coverage: 80% line, 95% on `rules/`
- Rule test pass rate: **100%**

---

## 7. Secrets & Sensitive Data

- **Never** commit a secret. Pre-commit hook scans for AWS keys, API tokens, private keys.
- **Never** log raw email content, document content, or PII at log level higher than DEBUG. Use structured logging with redaction.
- **Never** include customer data in a prompt that gets logged at INFO. Token-count it, hash it, summarise it — but don't log it raw.
- `.env` files are gitignored. `.env.example` is committed.
- Production secrets live in Vercel + Railway environment variables. Local dev uses `.env.local`.

---

## 8. Dependencies

- **Adding a new dep needs a one-line justification in the PR description.** "Why this and not the standard library / existing dep?"
- **No unmaintained packages.** "Last commit >18 months ago" is a hard reject.
- **Pin major versions.** `^1.2.3` is fine. `*` is not.
- **One package manager per project:** `pnpm` for the monorepo, `uv` for Python.

---

## 9. Documentation

- **Every public function in `apps/ai-service/`** has a docstring with: purpose, params, returns, exceptions, example.
- **Every tRPC procedure** has a JSDoc block describing what it does and any side effects.
- **Architectural changes** get an entry in `ARCHITECTURE.md` §8 (ADR log) — date, decision, alternatives, reasoning.
- **Phase transitions** update `PROJECT.md` §7.

---

## 10. Performance Budgets

| Surface | Budget | Measured by |
|---|---|---|
| Next.js TTFB (Vercel edge) | <200ms | Vercel analytics |
| Dashboard initial load | <2s on 3G | Lighthouse CI |
| tRPC procedure p95 | <300ms | Sentry performance |
| Compliance audit (full org) | <10s | App-level timing |
| Email classification | <500ms | Per the model routing table in `ARCHITECTURE.md` §6.3 |
| Email draft generation | <3s | Same |
| LLM prompt cache hit rate | >85% on cacheable layers | Inngest custom metric |

PR is blocked if it regresses any budget by >20% without justification.

---

## 11. Accessibility

- WCAG 2.1 AA minimum.
- All interactive elements have a keyboard path.
- Colour is never the only signal — heat map cells have icons too (✓ / ! / ✗) for green/amber/red.
- Compliance Score has a textual description, not just a number ("83 — strong compliance with minor advisory items outstanding").

---

## 12. Tradie-Specific UX Conventions

The launch vertical has UX needs that generic SaaS doesn't:

- **Big tap targets on mobile.** Minimum 48px. Sparkies have plaster on their thumbs.
- **Voice input on every text field** in mobile app (Phase 6).
- **Offline-first** — every critical mobile feature works without cell coverage. Rural NZ/AU sites have none. Sync when connectivity returns.
- **Plain English over jargon.** Say "Your licence renewal is due in 14 days," not "LBP renewal cycle approaching 14-day threshold."
- **Show the legislation reference** anywhere a compliance verdict is shown. Tradies are sceptical and want the source.

---

*Atlas AI · Conventions v1.0 · May 2026 · Confidential*
