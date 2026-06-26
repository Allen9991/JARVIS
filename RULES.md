# Atlas AI — Engineering Rules

> These are the non-negotiable engineering standards both agents follow. They exist because they are the difference between software that works at 10 users and software that still works at 10,000. Every rule here was written in blood somewhere — someone shipped without it and paid the price. Neither agent skips these. Neither agent argues with them.

---

## Rule 0 — Read Before You Write

Before writing a single line of code on any task:

1. Read `PROJECT.md` — understand what you're building and why
2. Read the relevant section of `ARCHITECTURE.md` — understand how it fits
3. Read `PLAN.md` — confirm the task is in the current phase
4. Read this file — confirm you know the standards

If you skip this step, you will build the wrong thing correctly. That is worse than building nothing.

---

## 1. Source Control

### 1.1 Git is the source of truth. Always.

- Every change goes through git. No exceptions. No "I'll commit it later."
- The repo at any point in time must be deployable. Never commit broken code to `main`.
- `main` is production. It is always clean, always green, always deployable.

### 1.2 Branch strategy

```
main                    ← production, protected, CI must pass to merge
  └─ feat/lbp-expiry-rule       ← one feature, one branch
  └─ fix/cross-tenant-query     ← one fix, one branch
  └─ chore/update-dependencies  ← one chore, one branch
```

- Branch names: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`
- One concern per branch. Do not mix a feature and a bug fix in the same branch.
- Delete branches after merging. A repo with 40 stale branches is a repo no one understands.

### 1.3 Commit discipline

Every commit must:
- Pass lint and typecheck (pre-commit hook enforces this)
- Represent one logical change — not "WIP" or "stuff"
- Follow Conventional Commits format (see `CONVENTIONS.md` §3.2)
- Leave the codebase in a working state

Never commit:
- Secrets, API keys, passwords, connection strings
- `console.log` / `print()` debug statements (use structured logging)
- Commented-out code ("I might need this later" — that's what git history is for)
- Generated files (`dist/`, `.next/`, `__pycache__/`)
- `node_modules/`

### 1.4 Pull Requests

- Every change to `main` goes through a PR. No direct pushes, ever.
- PR must have a description that explains what and why — not just what (the diff shows what)
- CI must be green before merge
- Squash merge — one clean commit per PR on `main`
- PR author does not merge their own PR without review (when a second human is available)
- Agents: follow the PR format in `CONVENTIONS.md` §3.3 exactly

---

## 2. Never Touch Production Data Directly

This is the rule that gets broken most often by small teams and causes the most irreversible damage.

- **No direct SQL edits to the production database.** Every schema change is a migration. Every data change is a script that gets reviewed, tested in staging, then run in production via CI.
- **No "quick fix" edits in the Supabase dashboard to production data.** If you must change production data, write a migration, review it, and run it.
- **No connecting your local development tools directly to the production database.** Use a staging environment or a local Supabase instance.
- **`audit_log` is append-only, forever.** Never delete from it. Never update it. If a record is wrong, write a corrective record.

---

## 3. Migrations — Append Only, Never Edit

- Every database change is a migration file. Changing a column, adding an index, dropping a table — all migrations.
- Migrations are numbered and timestamped: `20260524_120000_add_licences_table.sql`
- Once a migration is committed to `main`, it is **permanent**. You do not edit it. If you made a mistake, write a new migration to fix it.
- Every migration must be:
  - **Reversible** where possible — write the `down` migration
  - **Tested locally** before committing
  - **Safe for existing data** — never drop a column or table without a deprecation period
  - **Reviewed** before running on production

### 3.1 Migration safety checklist

Before running any migration on production:

- [ ] Tested on local Supabase with realistic data
- [ ] Reviewed by Claude Code (schema is Claude Code's territory)
- [ ] Does not delete data
- [ ] Does not break existing queries (check for column renames)
- [ ] RLS policies added/updated if new tenant-scoped table
- [ ] Indexes added for foreign keys and common query patterns
- [ ] Runs in under 30 seconds on the production dataset size

---

## 4. Environment & Secrets Management

### 4.1 Secrets never go in code

- API keys, database URLs, passwords — **never** in source code
- **Never** in git history — if a secret is accidentally committed, rotate it immediately, then remove it from git history
- Secrets live in: Vercel environment variables (frontend), Railway environment variables (AI service), `.env.local` (local dev, gitignored)
- `.env.example` is committed. It contains placeholder values and comments. Not real values.

### 4.2 Secret rotation

- Production secrets are rotated every 90 days
- If a secret is exposed (accidentally committed, shared via Slack, etc.) — rotate it immediately, assume it's compromised
- `AI_SERVICE_SHARED_SECRET` must be a cryptographically random 32-byte hex string — not `"atlas-dev-secret"`

### 4.3 Environment tiers

| Tier | Purpose | Database | Secrets |
|---|---|---|---|
| Local | Development | Local Supabase (`supabase start`) | `.env.local` |
| Preview | PR review (Vercel preview) | Staging Supabase project | Vercel preview env vars |
| Production | Real users | Production Supabase | Vercel + Railway prod env vars |

Never use production credentials in local development. Never.

---

## 5. Testing — Not Optional

### 5.1 The rule

**If it doesn't have a test, it doesn't work.** It may appear to work. It will break when you change something adjacent to it in three months.

### 5.2 What to test

| Type | What | Framework | Required? |
|---|---|---|---|
| Unit | Pure functions, formatters, calculators, utilities | Vitest / pytest | Yes |
| Integration | tRPC procedures end-to-end, DB queries with real data | Vitest / pytest | Yes for anything that touches the DB |
| Compliance rules | Every rule, every verdict path, every boundary case | pytest | **Yes — 100% coverage on rules** |
| Component | React components with logic/state | Vitest + Testing Library | Yes for components with logic |
| E2E | Critical user flows (sign up, create org, compliance score) | Playwright | Yes — minimum 5 critical flows |
| Security | Tenant isolation, auth bypass attempts | pytest / Playwright | Yes — non-negotiable |

### 5.3 Test-first for compliance rules

Every compliance rule is written **test-first**:

1. Write the test cases in `test_cases_json` (see `COMPLIANCE.md` §12)
2. Run the tests — they should fail (rule doesn't exist yet)
3. Implement the rule
4. Run the tests — they must all pass
5. CI enforces 100% pass rate on rule tests

This is not optional. A compliance rule without passing test cases is not done.

### 5.4 Test quality rules

- Tests must be **independent** — one test's pass/fail must not depend on another test running first
- Tests must be **deterministic** — same result every time, no flakiness
- Tests must be **fast** — unit tests under 5ms each, integration tests under 500ms each
- No `sleep()` or time-based waits in tests — use mocks or deterministic state
- No testing implementation details — test behaviour, not internals

### 5.5 When CI is red, everything stops

A red CI pipeline is a four-alarm fire. The team stops what they're doing and fixes it. A broken `main` blocks everyone. The rule: **you broke it, you fix it, you fix it now.**

---

## 6. Error Handling — Every Path

### 6.1 Errors are first-class citizens

Handle errors where they happen. Do not let them bubble up silently. Do not swallow them. Do not log them and continue as if nothing happened.

### 6.2 TypeScript (Next.js / tRPC)

```ts
// WRONG — silent failure
try {
  await sendEmail(draft);
} catch (e) {
  console.log(e);
}

// WRONG — untyped catch
} catch (e: any) {

// RIGHT
try {
  await sendEmail(draft);
} catch (error) {
  if (error instanceof NylasError) {
    logger.error('Email send failed', { draftId: draft.id, error: error.message });
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send email' });
  }
  throw error; // re-throw unexpected errors
}
```

tRPC error codes to use:
- `UNAUTHORIZED` — not authenticated
- `FORBIDDEN` — authenticated but not allowed (wrong org)
- `NOT_FOUND` — resource doesn't exist
- `BAD_REQUEST` — invalid input (usually caught by Zod first)
- `INTERNAL_SERVER_ERROR` — unexpected failure (always logged)

### 6.3 Python (AI service)

```python
# WRONG
try:
    result = call_anthropic(prompt)
except:
    pass

# WRONG — too broad
except Exception as e:
    print(e)

# RIGHT
except anthropic.APIStatusError as e:
    logger.error("Anthropic API error", extra={"status": e.status_code, "rule_id": rule_id})
    raise ComplianceEngineError(f"LLM call failed: {e.message}") from e
```

- No bare `except:` ever
- Always re-raise or return a typed error
- Always log with structured context (what was being attempted, what IDs were involved)

### 6.4 LLM outputs are untrusted

Every response from the Claude API is treated as untrusted input:

```python
# WRONG — trusting LLM output directly
result = await claude.complete(prompt)
return result.content[0].text  # could be anything

# RIGHT — validate against schema
result = await claude.complete(prompt)
raw = result.content[0].text
try:
    parsed = EmailClassification.model_validate_json(raw)
except ValidationError as e:
    logger.warning("LLM returned invalid JSON, retrying", extra={"raw": raw[:200]})
    # retry once with stricter prompt
    # if retry fails, return default classification
    return EmailClassification(category="ADMIN", urgency="low", requires_response=False)
```

All LLM outputs validated with Pydantic before use. Always.

---

## 7. Logging & Observability

### 7.1 Structured logging only

No `print()`. No `console.log()` in production code. Use structured logging that produces machine-readable output.

```python
# WRONG
print(f"Processing email {email_id}")

# RIGHT
logger.info("Email classification started", extra={
    "email_id": email_id,
    "org_id": org_id_hash,   # hashed — never log raw org IDs
    "model": "claude-haiku-4-5",
    "prompt_version": "email_classify_v2.3"
})
```

```ts
// WRONG
console.log('tRPC call:', procedure, result);

// RIGHT
logger.info('tRPC procedure completed', {
  procedure: 'compliance.audit',
  org_id_hash: hashOrgId(ctx.orgId),
  duration_ms: Date.now() - startTime,
  success: true
});
```

### 7.2 What to log

**Always log:**
- Every tRPC procedure call (procedure name, hashed org_id, duration, success/error)
- Every LLM call (model, prompt version, token counts, latency, success/error)
- Every compliance rule evaluation (rule_id, rule version, verdict, duration)
- Every external API call (Nylas, Xero, ATO, IRD — endpoint, status, duration)
- Every error with stack trace
- Every auth event (login, logout, invite accepted, failed login)

**Never log:**
- Raw email content (PII)
- Document content (PII)
- Passwords, tokens, or API keys
- Raw org IDs (hash them: `hashOrgId(orgId)`)
- Employee names or salaries
- Tax file numbers or IRD numbers

### 7.3 Log levels

- `DEBUG` — detailed diagnostic info, not in production
- `INFO` — normal operations (procedure called, email classified, rule evaluated)
- `WARNING` — unexpected but handled (LLM returned invalid JSON, retrying; rate limit hit)
- `ERROR` — something failed (external API down, DB connection failed)
- `CRITICAL` — system is broken and needs immediate human attention

### 7.4 Alerts

Set up alerts in Sentry/Axiom for:
- Error rate > 1% over 5 minutes
- P95 latency > 2x the baseline
- Any `CRITICAL` log event
- Compliance rule test suite failure

---

## 8. Security

### 8.1 The tenant isolation checklist

Every PR that touches a database query gets checked against this list:

- [ ] Does the query include an `org_id` filter on every tenant-scoped table?
- [ ] Does the tRPC procedure call `requireOrgMember(orgId)` before any data access?
- [ ] Does the Supabase RLS policy on this table enforce tenant isolation?
- [ ] Is the Supabase service role key used server-side only?
- [ ] Would a logged-in user from Org B be able to see Org A's data through this endpoint?

If any answer is wrong, the PR is blocked.

### 8.2 Input validation everywhere

- Every tRPC procedure input validated with Zod. No raw inputs reach the database.
- Every Python API endpoint input validated with Pydantic. No raw inputs reach the rules engine.
- Validate at the boundary — the moment data enters your system from outside.

```ts
// WRONG — raw input to DB
.query(async ({ ctx, input }) => {
  return db.select().from(emails).where(eq(emails.id, input.id));
})

// RIGHT — Zod validates input shape and types
.input(z.object({ emailId: z.string().uuid(), orgId: z.string().uuid() }))
.query(async ({ ctx, input }) => {
  await ctx.requireOrgMember(input.orgId);
  return db.select().from(emails)
    .where(and(eq(emails.id, input.emailId), eq(emails.orgId, input.orgId)));
})
```

### 8.3 Prompt injection defence

User-provided content (emails, document text, voice transcriptions) must never be mixed with system instructions. Always use delimiters:

```python
# WRONG — user content mixed with instructions
prompt = f"Classify this email and respond in JSON: {email_body}"

# RIGHT — clear delimiter between instruction and data
prompt = f"""Classify the email below and respond in JSON only.

<email>
{email_body}
</email>

JSON response:"""
```

The LLM must never be in a position where user content could override system instructions.

### 8.4 Dependency security

- Run `pnpm audit` and `pip audit` on every PR
- No packages with known critical CVEs — block the PR until updated
- Review changelogs before updating major versions

---

## 9. Performance

### 9.1 Measure before optimising

Never optimise based on intuition. Measure first. The thing you think is slow is rarely the thing that's actually slow.

Use Sentry Performance to find actual p95 bottlenecks. Fix those. Don't pre-optimise.

### 9.2 Database query rules

- Every query that could return many rows must have a `LIMIT`
- Pagination on every list endpoint — cursor-based, not offset (offset is slow on large datasets)
- `SELECT *` is forbidden — always list the columns you actually need
- No N+1 queries — if you're calling the DB in a loop, you have an N+1 problem
- Add an index before adding a `WHERE` clause on a new column

```ts
// WRONG — N+1
const jobs = await db.select().from(jobs).where(eq(jobs.orgId, orgId));
for (const job of jobs) {
  job.assignments = await db.select().from(jobAssignments).where(eq(jobAssignments.jobId, job.id));
}

// RIGHT — join
const jobs = await db
  .select()
  .from(jobs)
  .leftJoin(jobAssignments, eq(jobs.id, jobAssignments.jobId))
  .where(eq(jobs.orgId, orgId));
```

### 9.3 LLM cost discipline

- Use Haiku 4.5 for classification and routing — it's 10x cheaper than Sonnet
- Cache the system prompt, jurisdiction context, and business context layers — see `ARCHITECTURE.md` §6.4
- Never send more context than the task needs — build a context assembler that selects relevant fields
- Log token counts on every call — if a call is unexpectedly expensive, investigate before it becomes a bill

### 9.4 Performance budgets

See `CONVENTIONS.md` §10. A PR that regresses any budget by >20% requires a written justification in the PR description. No justification = PR blocked.

---

## 10. Code Quality

### 10.1 The boy scout rule

Leave the code cleaner than you found it. If you touch a file, fix one small thing that bothered you (a confusing variable name, a missing type annotation, an untested edge case). Don't leave it for later — later never comes.

### 10.2 Functions do one thing

A function that does two things should be two functions. A file with 500 lines probably has too many concerns. Extract.

### 10.3 Name things what they are

```ts
// WRONG — what is d? what is r?
const d = new Date();
const r = await fetch('/api/things');

// RIGHT
const currentDate = new Date();
const complianceAuditResult = await fetchComplianceAudit(orgId);
```

If you need a comment to explain what a variable name means, rename the variable.

### 10.4 Comments explain why, not what

```ts
// WRONG — describes what the code does (we can read the code)
// Add 1 to the index
index = index + 1;

// RIGHT — explains why (we couldn't know this without the comment)
// Holidays Act requires we use the HIGHER of OWP and AWE — this checks both
const leaveRate = Math.max(ordinaryWeeklyPay, averageWeeklyEarnings);
```

### 10.5 No dead code

- No commented-out code. Git history is your undo button.
- No unused imports. Linters enforce this.
- No unreachable branches.
- No `TODO` items that are more than one sprint old — either do it or create a ticket or delete it.

### 10.6 Complexity limits

- Maximum function length: 50 lines. If you're over, extract.
- Maximum file length: 300 lines. If you're over, split the module.
- Maximum cyclomatic complexity: 10. Deep nesting is a signal to refactor.
- These are soft limits — a 60-line function that's crystal clear is fine. A 30-line function with 6 levels of nesting is not.

---

## 11. The Compliance Engine — Special Rules

The rules engine has additional standards beyond everything above. See `COMPLIANCE.md` for the full doctrine. Summary:

- **The LLM never makes compliance decisions.** Deterministic code only. No exceptions.
- **Every rule has test cases.** Written before the rule. 100% pass rate required. No exceptions.
- **Every evaluation is logged immutably.** The audit record is the legal foundation of the product. No exceptions.
- **Rules are data, not code.** JSON definitions. Non-engineers must be able to read and review them.
- **Historical rules are never deleted.** They get an `effective_to` date. Historical audits use historical rules.

Violating any of these is not a PR comment. It's a PR rejection.

---

## 12. What "Done" Means

A task is **done** when all of the following are true. Not most. All.

- [ ] The feature works as specified
- [ ] It works at the edge cases (empty state, error state, maximum values)
- [ ] It has tests covering all paths
- [ ] Tests pass in CI
- [ ] It doesn't regress any existing tests
- [ ] It doesn't regress performance budgets
- [ ] It has structured logging for observable operations
- [ ] It handles errors explicitly — no silent failures
- [ ] Secrets are not hardcoded
- [ ] It has been reviewed (by the other agent or the human)
- [ ] The PR description is complete per `CONVENTIONS.md` §3.3
- [ ] `PLAN.md` is updated to mark the task complete

"It works on my machine" is not done. "I'll write the tests later" is not done. "It mostly works" is not done.

---

## 13. What To Do When Stuck

1. **Reread the relevant doc.** Most questions are answered in `PROJECT.md`, `ARCHITECTURE.md`, `COMPLIANCE.md`, or `CONVENTIONS.md`.
2. **Check `PLAN.md`.** Is this task even in the current phase? Are its dependencies done?
3. **Ask the other agent.** If it's a frontend question, ask Codex. If it's a compliance/security question, ask Claude Code.
4. **Stop and ask the human.** This is not a sign of failure. The human would rather answer a question than review code built on a wrong assumption. Situations where you must stop and ask:
   - The requirements are ambiguous and guessing would create legal exposure
   - Two docs appear to contradict each other
   - A security trade-off has no clear winner
   - A dependency (third-party API, legislation) behaves contrary to what was expected
   - The correct behaviour at a boundary case isn't specified

**Never guess on compliance rules. Never guess on security. Ask.**

---

*Atlas AI · Engineering Rules v1.0 · May 2026 · These rules do not expire.*
