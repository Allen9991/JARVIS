# Atlas AI — Project Overview

> **Read this first.** Every agent (Claude Code, Codex) and every human contributor reads this file before touching code. It is the single source of truth for what we are building and why.

---

## 1. What Atlas AI Is

Atlas AI is a JARVIS-inspired **intelligent business administration platform** for small and medium businesses in New Zealand and Australia. Initial vertical: **tradies** (builders, electricians, plumbers, gasfitters, drainlayers, painters).

**The one-line pitch:** the AI Business Operating System that handles compliance, communications, and operations so the owner can focus on the work they actually love.

**The moat:** a deterministic, jurisdiction-aware **compliance rules engine** combined with AI-powered document generation. Tradify and Fergus manage jobs. Atlas keeps tradies legal *while* managing jobs.

---

## 2. The Four Pillars

Every feature maps to one of these four pillars. If a proposed feature does not, it does not get built.

| # | Pillar | What it does | Lead agent |
|---|---|---|---|
| 1 | **Business Brain** (Knowledge Engine) | Persistent, evolving model of each business: services, pricing, policies, team, customers, patterns. Document indexing + semantic search over pgvector. | Claude Code (AI service) + Codex (UI) |
| 2 | **Compliance Guardian** | Real-time monitoring against NZ + AU regulations. Deterministic rules engine. Compliance Score 0–100. Heat map. Regulation Radar. | **Claude Code** (sole owner of rules engine) |
| 3 | **Communication Hub** | Smart inbox triage, AI-drafted replies in the owner's voice, follow-up engine for quotes/invoices, review response generator. | Claude Code (prompts + LangGraph) + Codex (inbox UI) |
| 4 | **Operations Autopilot** | Invoice generation from natural language, quote builder, document assembly, expense categorisation, cash flow forecasting, scheduling. | Codex (lead) + Claude Code (AI nodes) |

---

## 3. The JARVIS Principle

> Atlas should feel like having a brilliant, knowledgeable business partner who never sleeps, never forgets a deadline, knows every regulation, and handles the work you hate — so you can focus on the work you love.

Concretely this means:
- **Natural language first.** The owner never needs to learn a UI. "How much GST do I owe this quarter?" → answer. "Chase up everyone who owes me money." → done.
- **Voice on mobile.** A sparkie on a job site speaks; Atlas acts.
- **Anticipate, don't just respond.** Atlas surfaces things the owner didn't ask about (expiring licence, looming GST deadline, unpaid invoice trending toward bad debt).
- **One-tap approval.** AI drafts everything; owner approves with one tap. Never sends without approval (except in explicit Autopilot mode within configured guardrails).

---

## 4. Target Users (initial vertical)

| Segment | Description | Tradie examples |
|---|---|---|
| Solo operators | 1 person, no employees | Self-employed sparkie, sole-trader plumber |
| Micro businesses | 2–10 staff | Small plumbing team, builder + 4 chippies |
| Small businesses | 11–50 staff | Established trade business with apprentices |

We are **NOT** building for: enterprise construction firms, white-collar professional services, retail, hospitality. Not yet.

---

## 5. What We Are NOT Building (Anti-Scope)

Memorise this list. Reject features that fall into it.

- ❌ **Our own auth** — Supabase Auth handles it
- ❌ **Our own design system** — shadcn/ui only
- ❌ **Real-time collaboration / CRDT / presence** — single-user-per-business initially
- ❌ **Our own PDF renderer** — react-pdf only
- ❌ **A chat interface as the primary UI** — dashboard with Cmd+K command bar is the main pattern; chat is *accessible from* the dashboard, not *the* dashboard
- ❌ **Payroll processing** — we audit it (PayHero NZ, KeyPay AU integration), we do not run it
- ❌ **Fine-tuned models** — prompt engineering + RAG only; revisit only if a specific task provably fails despite optimisation
- ❌ **Full Modern Award coverage on day one** — top 10 awards first (Clerks Private Sector, General Retail, Hospitality, Building and Construction Award, etc.); full 120+ award coverage is a 12–18 month project
- ❌ **Microservices** — monolith-first. Two services total: Next.js (web + API) and Python (AI service). Extract more only with empirical bottleneck evidence.

---

## 6. Markets & Jurisdictions

| Market | Status | Jurisdiction pack |
|---|---|---|
| 🇳🇿 New Zealand | Phase 1 launch | `rules/nz/` — GST 15%, Holidays Act 2003, PAYE, KiwiSaver, Privacy Act 2020, HSWA 2015, LBP/EWRB/PGDB licensing, Construction Contracts Act 2002 |
| 🇦🇺 Australia | Phase 5 launch | `rules/au/` — GST 10%/BAS, STP Phase 2, Modern Awards (top 10), Fair Work Act, Superannuation, Privacy Act 1988, state-based WHS + licensing (NSW/VIC/QLD first), TPAR, Security of Payment Acts |
| 🇦🇪 UAE | Future (Phase 4+) | `rules/ae/` |
| 🇮🇳 India | Future (Phase 4+) | `rules/in/` |

**Jurisdiction packs are pluggable.** Adding a new country means building a new pack — it must not require touching core platform code.

---

## 7. Current Phase

> **🎯 Phase 0: Foundation (Weeks 1–2)**

**Deliverable:** an empty shell that handles auth, multi-tenancy, and deploys automatically.

Phase 0 scope:
- Next.js 15 project (App Router) with tRPC, Tailwind CSS, shadcn/ui
- Supabase project: database schema, RLS policies, auth configuration
- Multi-tenancy via `organisation_id` foreign key + RLS — **never separate databases**
- Core tables: `organisations`, `users`, `org_memberships`, `audit_log`
- GitHub repo with CI/CD: push to main = deploy to Vercel + Railway
- Seed script that creates a test organisation with realistic tradie data
- Python AI service skeleton on Railway (FastAPI + LangGraph stub)

**Phase 0 acceptance:** an owner can sign up, create an organisation, invite a teammate, log in, see an empty dashboard, and the audit_log records every action. The Python AI service responds to a `/health` check from the Next.js app.

See `ARCHITECTURE.md` for full phase breakdown.

---

## 8. The Stack (One-Liner Each)

| Layer | Choice |
|---|---|
| Web frontend | Next.js 15 (App Router) on Vercel |
| Mobile | React Native (Expo) — Phase 6 only |
| API | Next.js API routes + tRPC |
| Database | Supabase (PostgreSQL 16 + pgvector) |
| Auth | Supabase Auth |
| Cache | Upstash Redis (serverless) |
| Object storage | Supabase Storage |
| Background jobs | Inngest |
| AI orchestration | LangGraph (Python service on Railway) |
| LLM | Claude API — Haiku 4.5 for routing/classification, Sonnet 4.6 for drafting/analysis |
| Rules engine | **Custom Python + JSON rule definitions** (not OPA, not Drools) |
| Email | Nylas (Gmail + Outlook unified) |
| Transactional email | Resend |
| Monitoring | Sentry (errors) + Axiom (logs) |
| CI/CD | GitHub Actions + Vercel auto-deploy |

Full justifications in `ARCHITECTURE.md` §1.

---

## 9. Agent Assignments

Two AI agents work on this codebase. Each has its own brief. **Read your brief before writing code.**

- **Claude Code** → owns AI service, compliance rules engine, prompts, DB schema + RLS, security-sensitive code. Brief: `CLAUDE.md`
- **Codex** → owns Next.js frontend, tRPC routers, shadcn/ui components, CRUD logic, tests, scaffolding. Brief: `CODEX.md`

**Shared territory:** the monorepo, `packages/shared` (types), `packages/db` (schema). Coordinate via PRs and ADR entries in `ARCHITECTURE.md`.

---

## 10. Success Metrics (so we know if we're winning)

**Product:**
- Activation rate (trial users completing Smart Onboarding + viewing compliance score): **70%**
- Time saved per user: **8+ hours/week by month 3**
- Compliance Score improvement: **+25 points within 90 days**
- Draft acceptance rate (AI emails sent unedited): **75%**
- Daily active usage: **60% of paying customers**

**Business:**
- MRR: **$50K by month 12, $200K by month 18**
- Trial-to-paid conversion: **25%**
- Monthly churn: **<3%**
- NPS: **50+**
- Advisor-referral acquisition: **30% by month 12**

---

## 11. Legal Boundaries (non-negotiable)

Atlas provides **tools and information**, not legal/tax/financial advice. Every compliance output must:

1. Be **grounded in indexed regulation text with citations** (the legislation reference is mandatory metadata on every rule)
2. Include a **confidence score**
3. Be **deterministically produced** by the rules engine (not an LLM judgment)
4. Be **logged immutably** in `audit_log` with rule version, inputs, verdict, and timestamp
5. Include a **disclaimer** that the output is indicative and should be verified by a qualified professional for high-stakes decisions

The LLM **never** decides whether something is compliant. It gathers data, formats results, and explains verdicts in plain English. The verdict itself always comes from deterministic code.

This is non-negotiable. See `COMPLIANCE.md` §1.

---

## 12. Where to Look for What

| Question | File |
|---|---|
| "What are we building and why?" | `PROJECT.md` (this file) |
| "How is it built? What's the stack? What's the schema?" | `ARCHITECTURE.md` |
| "How does the compliance engine work? What's a rule?" | `COMPLIANCE.md` |
| "What's my job as Claude Code?" | `CLAUDE.md` |
| "What's my job as Codex?" | `CODEX.md` |
| "How do we write code here? Naming, commits, PRs?" | `CONVENTIONS.md` |

---

*Atlas AI · Version 1.0 · May 2026 · Confidential*
