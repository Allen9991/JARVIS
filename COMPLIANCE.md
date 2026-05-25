# Atlas AI — Compliance Engine

> **The moat.** This is what makes Atlas genuinely valuable rather than a ChatGPT wrapper. Read carefully — this doctrine is non-negotiable. The rules engine is owned by Claude Code.

---

## 1. Core Principles (Non-Negotiable)

### 1.1 The LLM never makes compliance decisions

The LLM **orchestrates** — it gathers data, asks clarifying questions, formats results, explains verdicts in plain English. It **never** decides whether something is compliant.

Why? An LLM that confidently tells a business owner they're GST-compliant when they're not creates real legal and financial liability for them and for us. Deterministic rules are **testable, auditable, and legally defensible**. LLM judgments are none of those things.

```
WRONG:  Pass financial data to Claude →  "Are they GST-compliant?"
RIGHT:  Pull financial data → run nz.gst.registration_threshold rule
        → get verdict → pass verdict + context to Claude →
        "Explain this verdict to the owner in plain English."
```

### 1.2 Rules are data, not code

Rules are defined as structured JSON, not hardcoded Python `if/else` statements. This means:

- Non-engineers (a compliance advisor) can review and update rules
- Rules can be versioned, compared, and rolled back
- The same engine evaluates NZ and AU rules without code changes
- Historical audits use the rules that were active at the evaluation date

### 1.3 Every evaluation is recorded

Every time the rules engine runs, it produces an audit record containing:

- Which rules were evaluated
- Which version of each rule
- What input data was used
- What the verdict was
- A human-readable explanation
- Timestamp

This is the **legal foundation of the product**. The `audit_log` table is append-only — no `UPDATE`, no `DELETE`, ever.

---

## 2. Rule Definition Schema

Every compliance rule is a JSON document of this shape:

```json
{
  "rule_id": "nz.gst.registration_threshold",
  "jurisdiction": "NZ",
  "category": "tax.gst",
  "version": "2.0",
  "effective_from": "2024-04-01",
  "effective_to": null,
  "supersedes": "nz.gst.registration_threshold_v1",
  "severity": "critical",
  "title": "GST registration threshold",
  "description": "Businesses must register for GST if turnover exceeds $60,000 in any 12-month period",
  "legislation_ref": "Goods and Services Tax Act 1985, s51",
  "inputs": [
    {
      "name": "annual_turnover",
      "type": "currency",
      "source": "xero.revenue_12mo | manual"
    },
    {
      "name": "is_gst_registered",
      "type": "boolean",
      "source": "business_profile.gst_registered"
    }
  ],
  "evaluation": {
    "type": "threshold",
    "condition": "annual_turnover >= 60000 AND is_gst_registered == false",
    "verdict_if_true": "non_compliant",
    "verdict_if_false": "compliant",
    "message_if_true": "Your annual turnover of {{annual_turnover}} exceeds the $60,000 GST registration threshold. You are legally required to register for GST.",
    "remediation": "Register for GST via myIR immediately. Backdated registration may be required. Consider consulting a tax advisor."
  }
}
```

**Required fields:** `rule_id`, `jurisdiction`, `category`, `version`, `effective_from`, `severity`, `title`, `legislation_ref`, `inputs`, `evaluation`.

**Naming convention for `rule_id`:** `{jurisdiction}.{category}.{specific_name}`. Lowercase, dot-separated, snake_case for the leaf. Examples:

- `nz.gst.registration_threshold`
- `nz.holidays_act.annual_leave_accrual`
- `nz.licensing.lbp_expiry`
- `au.whs.swms_required`
- `au.qld.qbcc_mfr`

---

## 3. Evaluation Types

The engine supports these evaluation types. Together they cover ~95% of compliance rules.

| Type | Description | Example |
|---|---|---|
| `threshold` | Compare a value against a limit | Turnover > $60K → must register for GST |
| `date_check` | Check if a deadline is approaching or overdue | GST return due within 28 days of period end |
| `calculation` | Compute a value and verify it | PAYE deduction matches IRD tables for income bracket |
| `presence_check` | Verify a required document/record exists | Employment agreement on file for each employee |
| `formula` | Apply a mathematical formula and validate | Holidays Act: OWP = gross earnings / actual days worked |
| `range_check` | Verify a value falls within an acceptable range | KiwiSaver employer contribution between 3% and 10% |
| `conditional` | Rule applies only if preconditions are met | Modern Award penalty rates only apply if employee works Sunday AND is casual |
| `composite` | Chain sub-rules with AND/OR logic | Payroll compliant = PAYE correct AND KiwiSaver correct AND Holidays Act correct |

---

## 4. The Evaluation Pipeline

When Atlas runs a compliance audit (on demand or scheduled), here is the exact sequence:

1. **Scope resolution** — determine which rules apply based on jurisdiction, industry, entity type, staff count. A sole trader with no employees skips all employment rules.
2. **Data gathering** — engine requests input data for each applicable rule. Sources: Xero/MYOB API, business profile, Supabase tables. **Missing data is flagged, not guessed.**
3. **Rule evaluation** — each rule evaluated deterministically. Composite rules evaluated after their dependencies.
4. **Verdict generation** — each rule produces one of: `compliant`, `non_compliant`, `needs_attention`, `insufficient_data`. Includes the specific values that triggered the verdict.
5. **Score calculation** — Compliance Score is a weighted average across all applicable rules. See §6.
6. **Audit record creation** — the complete evaluation is recorded in `audit_log` with all inputs, rule versions, verdicts, and score. **Immutable.**
7. **LLM summary** — raw audit results passed to Sonnet, which generates the plain-English summary and prioritised remediation plan. **This is the only LLM step.**

---

## 5. Verdicts

Every rule produces exactly one of these four verdicts:

| Verdict | Meaning | Score contribution |
|---|---|---|
| `compliant` | Rule passes. No action needed. | 1.0 |
| `needs_attention` | Approaching a deadline or threshold; not yet a breach. | 0.5 |
| `insufficient_data` | Cannot evaluate — missing inputs. **Penalised** to incentivise data completeness. | 0.3 |
| `non_compliant` | Rule fails. Legal/financial exposure. | 0.0 |

`insufficient_data` is **not** a free pass. We penalise it because a business that hasn't connected Xero is a business we can't actually help.

---

## 6. The Compliance Score

Deliberately simple so business owners can understand it.

```
Score = (Σ rule_weight × rule_score) / (Σ rule_weights) × 100

rule_score:
  compliant         = 1.0
  needs_attention   = 0.5
  insufficient_data = 0.3
  non_compliant     = 0.0

rule_weight:
  critical  = 3   (legal requirement, fines possible)
  important = 2   (best practice, risk exposure)
  advisory  = 1   (recommended, no direct penalty)
```

**Intuition:**
- All `critical` rules compliant but missing some `advisory` items → ~85
- One `critical` non-compliance → drops to 60–70

This creates the right incentive: fix critical first, then chase the long tail. Owners want to hit 100 — compliance gets gamified.

---

## 7. Severity Levels

| Severity | Meaning | Examples |
|---|---|---|
| `critical` | Legal requirement; fines, prosecution, or personal liability possible | LBP expiry, GST registration, SWMS for HRCW, asbestos licensing, retention trust accounts |
| `important` | Strong best practice or contractual risk | Toolbox talks, hazard register updates, contractor classification reviews |
| `advisory` | Recommended; no direct penalty | Privacy policy refresh, employee handbook review, NDA template updates |

---

## 8. NZ Jurisdiction Pack

All NZ rules live in `apps/ai-service/rules/nz/`. Organised by category.

### 8.1 Tax & Financial

| Area | Rules to implement | Automation level |
|---|---|---|
| **GST (15%)** | Registration threshold ($60K), filing deadlines (2/6-monthly), return preparation, input tax credit tracking | Full audit + draft returns |
| **Income Tax / IRD** | Provisional tax dates, RIT calculations, terminal tax, IR3/IR4 preparation reminders | Audit + reminders |
| **PAYE & Payroll** | Correct PAYE deductions, KiwiSaver employer contributions (3%), ESCT rates, payday filing | Full automation |
| **ACC** | Levy calculations (construction CU codes are the highest), invoice verification, classification review | Audit + reminders |
| **Provisional tax** | Monitor turnover against thresholds; calculate using standard/estimation/ratio methods; instalment reminders | Audit + calculation |

### 8.2 Employment

| Area | Rules | Automation |
|---|---|---|
| **Holidays Act 2003** | Annual leave (4 weeks), sick leave (10 days), bereavement, public holidays, **OWP vs AWE calculations (use higher)** | Full automation |
| **Employment** | Employment agreement requirements, 90-day trials, restructuring obligations, minimum wage | Templates + audit |
| **Contractor vs employee** | Apply the **Employment Relations Amendment Act 2026** tests; produce risk assessment (low/medium/high); flag borderlines | Audit + questionnaire |

> **Holidays Act note (tradie-critical):** variable hours, on-call, and seasonal patterns make this calculation notoriously error-prone. We must compute **both** OWP (Ordinary Weekly Pay) and AWE (Average Weekly Earnings) and use the **higher** — this is a statutory requirement, not optional.

### 8.3 Privacy & Safety

| Area | Rules | Automation |
|---|---|---|
| **Privacy Act 2020** | Data breach notification (72hr), privacy officer designation, access request tracking, PIAs | Audit + templates |
| **Health & Safety at Work Act 2015** (HSWA) | PCBU obligations, hazard register, incident reporting, worker engagement | Audit + reminders |
| **HSAW Amendment Bill 2026** | New "critical risks" focus for small PCBUs (<20 workers) — increases documentation requirements | Audit + templates |

### 8.4 Tradie-Specific (NZ)

This is the launch vertical. These rules go in Phase 0 alongside the foundation.

**Licensing & Registration:**

| Licence | Body | Cycle | CPD | Rule examples |
|---|---|---|---|---|
| **Licensed Building Practitioner (LBP)** | MBIE / Building Practitioners Board | Annual (1 Nov) | 1 Skills Maintenance activity/year | `nz.licensing.lbp_expiry`, `nz.licensing.lbp_cpd_complete`, `nz.licensing.lbp_class_match` |
| **Registered Electrician / Electrical Worker** | EWRB | Biennial | Prescribed hours | `nz.licensing.electrician_practising_expiry`, `nz.licensing.electrician_cpd`, `nz.licensing.apprentice_supervision_ratio` |
| **Certified Plumber / Gasfitter / Drainlayer** | PGDB | Annual | Annual CPD course | `nz.licensing.pgd_expiry`, `nz.licensing.pgd_cpd`, `nz.licensing.trainee_authorisation` |
| **Site Safe Passport** | Site Safe NZ | 3–5 years | Refresher | `nz.licensing.site_safe_passport_expiry` |
| **Asbestos Removal (Class A/B)** | WorkSafe NZ | 5 years | Competency | `nz.licensing.asbestos_licence_expiry`, `nz.asbestos.notification_required` |

**Site safety (HSWA):**

| Requirement | Rule examples |
|---|---|
| Hazard register | `nz.hsaw.hazard_register_present`, `nz.hsaw.hazard_register_per_job` |
| Site-Specific Safety Plan (SSSP) | `nz.hsaw.sssp_required`, `nz.hsaw.sssp_pdf_generated` |
| Toolbox talk records | `nz.hsaw.toolbox_talk_daily` |
| Incident / near-miss reporting | `nz.hsaw.incident_classification`, `nz.hsaw.worksafe_notification_required` |
| Notifiable work (24hr) | `nz.hsaw.notifiable_work_detected` (excavations >1.5m, work at height >5m, asbestos, confined spaces) |
| PPE register | `nz.hsaw.ppe_register_present`, `nz.hsaw.ppe_inspection_overdue` |

**Building consent & RBW:**

| Step | Rule examples |
|---|---|
| Consent required? | `nz.building.consent_required_decision_tree`, `nz.building.schedule_1_exemption` |
| LBP class matching | `nz.building.lbp_class_required_for_scope` |
| Record of Work (RoW) | `nz.building.row_required`, `nz.building.row_submitted_with_ccc` |
| Producer statements (PS1–PS4) | `nz.building.ps_collection_status` |
| CCC readiness | `nz.building.ccc_checklist_progress` |

**Financial (Construction-specific):**

| Area | Rule examples |
|---|---|
| **Retentions regime (Construction Contracts Act 2002)** | `nz.financial.retention_trust_required`, `nz.financial.retention_release_due` |
| **Payment claims (CCA)** | `nz.financial.payment_claim_compliant`, `nz.financial.payment_response_deadline_20wd` |

---

## 9. AU Jurisdiction Pack

All AU rules live in `apps/ai-service/rules/au/`. Note: many trade rules are **state-based** — sub-organise as `au/qld/`, `au/nsw/`, `au/vic/`, etc.

### 9.1 Tax & Financial

| Area | Rules | Automation |
|---|---|---|
| **GST (10%) / BAS** | Registration threshold ($75K AUD), BAS preparation, lodgement dates, input tax credits | Full audit + draft BAS |
| **Income Tax / ATO** | PAYG instalments, company tax rate, franking credits, lodgement deadlines | Audit + reminders |
| **Single Touch Payroll** | STP Phase 2 reporting, pay categories, tax-free thresholds, HELP/HECS deductions | Full automation |
| **Superannuation** | SG rate (currently 11.5%), choice of fund, max contribution caps, due dates | Full automation |
| **State payroll tax** | Threshold monitoring per state, grouping rules, monthly/annual returns | Audit + calculation |
| **TPAR (Building & Construction)** | Collect subcontractor payment data year-round; generate TPAR for ATO by 28 August | Full automation |

### 9.2 Employment

| Area | Rules | Automation |
|---|---|---|
| **Modern Awards** | **120+ awards exist; start with top 10**. Penalty rates, overtime, allowances, classification matching | Audit + calculation |
| **Fair Work Act** | NES entitlements, unfair dismissal, redundancy calculations, notice periods | Templates + audit |
| **Privacy Act 1988** | APP compliance, notifiable data breach scheme, privacy policy requirements | Audit + templates |

**Top 10 Modern Awards to implement first:**
1. Clerks—Private Sector Award
2. General Retail Industry Award
3. Hospitality Industry (General) Award
4. **Building and Construction General On-site Award**
5. **Electrical, Electronic and Communications Contracting Award**
6. **Plumbing and Fire Sprinklers Award**
7. Manufacturing and Associated Industries Award
8. Road Transport (Long Distance) Award
9. Restaurant Industry Award
10. Storage Services and Wholesale Award

Building/Electrical/Plumbing awards are priority — they are the launch vertical.

### 9.3 State-Based Trade Licensing

| State | Regulator | Licence types | Rule prefix |
|---|---|---|---|
| **NSW** | NSW Fair Trading | Builder, Electrician, Plumber, Trade qualification holder | `au.nsw.licensing.*` |
| **VIC** | VBA / Energy Safe Victoria | Registered Building Practitioner, Licensed Electrician, Licensed Plumber | `au.vic.licensing.*` |
| **QLD** | QBCC | Contractor, nominee, site supervisor — **with MFR (Minimum Financial Requirements)** | `au.qld.licensing.*`, `au.qld.qbcc_mfr` |
| **SA** | Consumer & Business Services SA | Building work contractor, supervisor | `au.sa.licensing.*` |
| **WA** | Building Services Board WA | Building contractor, Electrician | `au.wa.licensing.*` |

### 9.4 WHS & Safe Work Method Statements (SWMS)

SWMS are legally required for all **19 categories of High Risk Construction Work** (HRCW) across Australia. Strictly enforced.

**HRCW categories to detect from job scope:**

| Category | Trigger | Rule |
|---|---|---|
| Work at height >2m | Roof work, scaffolding, ladder access | `au.whs.hrcw.height` |
| Demolition | Demolition keywords; pre-1990 building age | `au.whs.hrcw.demolition` |
| Excavation/trenching | Depth >1.5m | `au.whs.hrcw.excavation` |
| Work near energised electrical | Live electrical work, switchboard work | `au.whs.hrcw.electrical` |
| Confined spaces | Tank, vessel, pit, void work | `au.whs.hrcw.confined_space` |
| Structural alteration | Temporary propping, load path management | `au.whs.hrcw.structural` |
| Work near traffic/roads | Road-adjacent jobs | `au.whs.hrcw.traffic` |
| Powered mobile plant | Crane, excavator, EWP — requires operator HRWL | `au.whs.hrcw.mobile_plant` |

For each detected category, the engine checks `au.whs.swms_required` and triggers the AI SWMS generator if no current SWMS exists.

**Other AU WHS rules:**

| Requirement | Rule |
|---|---|
| WHS Management Plan (projects >$250K) | `au.whs.management_plan_required` |
| Principal Contractor duties | `au.whs.principal_contractor_duties` |
| High Risk Work Licences (HRWL) | `au.whs.hrwl_verification` |
| Asbestos awareness training | `au.whs.asbestos_awareness_training` |
| Notifiable incidents | `au.whs.notifiable_incident_classification` |
| Psychosocial hazards (2023 amendments) | `au.whs.psychosocial_risk_assessment` |

### 9.5 Construction Financial (AU)

| Area | Rules |
|---|---|
| Security of Payment Acts (state-varying) | `au.{state}.payment_claim_compliant`, `au.{state}.adjudication_deadline` |
| Home Building Compensation / Insurance | `au.{state}.home_warranty_required` (NSW/VIC: residential >$20K) |
| QBCC MFR (QLD) | `au.qld.qbcc_mfr` — composite rule: current ratio ≥ 1.0 AND NTA ≥ 0 AND annual reporting submitted |
| Subbie super for deemed employees | `au.super.contractor_deemed_employee` |

---

## 10. Sample Rules (Reference Implementations)

These are reference rules. Claude Code implements all of them as part of Phase 3 (NZ) and Phase 5 (AU). Format must match §2 exactly.

### 10.1 LBP expiry check (NZ)

```
rule_id: nz.licensing.lbp_expiry
jurisdiction: NZ
severity: critical
evaluation: date_check

Checks if any LBP licence in the organisation expires within 30 days.
Verdict: non_compliant if expired, needs_attention if expiring within 30 days.
Remediation: direct link to LBP renewal portal with pre-populated checklist.
```

### 10.2 SWMS required (AU)

```
rule_id: au.whs.swms_required
jurisdiction: AU
severity: critical
evaluation: conditional

For each active job, checks if scope matches any of the 19 HRCW categories.
If yes, checks if a current SWMS exists for that job.
Verdict: non_compliant if HRCW detected with no SWMS.
Automation: triggers AI SWMS generator and queues for worker review.
```

### 10.3 Retention trust compliance (NZ)

```
rule_id: nz.financial.retention_trust
jurisdiction: NZ
severity: critical
evaluation: calculation

Checks if retention money held exceeds $0 and verifies trust account is in place
as required by Construction Contracts Act 2002 amendments.
Verdict: non_compliant if retentions held without trust arrangement.
```

### 10.4 Apprentice supervision ratio (NZ)

```
rule_id: nz.licensing.apprentice_supervision
jurisdiction: NZ
severity: critical
evaluation: formula

For each scheduled day, counts apprentices and qualified supervisors.
Verifies ratio does not exceed board-mandated limits (varies by trade: typically 1:1 or 1:2).
Verdict: non_compliant if apprentice scheduled without adequate supervision.
```

### 10.5 QBCC Minimum Financial Requirements (QLD)

```
rule_id: au.qld.qbcc_mfr
jurisdiction: AU-QLD
severity: critical
evaluation: composite

Sub-rules:
  - current_ratio >= 1.0
  - net_tangible_assets >= 0
  - annual_reporting_submitted_within_deadline

Uses financial data from Xero/MYOB.
Verdict: non_compliant if any sub-rule fails.
Impact: QBCC non-compliance can result in licence suspension.
```

---

## 11. Handling Regulation Changes

This is the operational challenge that kills compliance products. Here's the system:

1. **Gazette monitoring** — weekly Inngest cron scrapes `legislation.govt.nz` (NZ) and `legislation.gov.au` (AU) for changes to monitored acts. Changes flagged for human review.
2. **Change assessment** — a compliance advisor (contractor, not full-time) reviews flagged changes. For straightforward rate changes (e.g. minimum wage), they update the rule JSON directly. For structural changes (new legislation), they work with engineering to design new rules.
3. **Rule versioning** — updated rules get a new `version` number and `effective_from` date. The old version remains in the database with an `effective_to` date set. **Historical audits always use the rules that were active at the evaluation date.**
4. **Tenant notification** — affected businesses receive a notification explaining the change and its impact. The notification is AI-generated from the rule diff.
5. **Regression testing** — every rule change triggers the full test suite. If any test fails, the change is **blocked** until the test is updated or the rule is corrected.

---

## 12. Testing Discipline

Every rule must ship with **test cases** in `test_cases_json`. Minimum coverage:

- One case per verdict path (typically 3–4: compliant, non_compliant, needs_attention, insufficient_data)
- Edge cases: boundary values (e.g. exactly $60,000 turnover for GST threshold), missing inputs, stale data
- Date-sensitive cases: evaluation just before `effective_from`, just after, just before `effective_to`

**Test format:**

```json
{
  "rule_id": "nz.gst.registration_threshold",
  "test_cases": [
    {
      "name": "below_threshold_unregistered",
      "inputs": {"annual_turnover": 45000, "is_gst_registered": false},
      "expected_verdict": "compliant"
    },
    {
      "name": "above_threshold_unregistered",
      "inputs": {"annual_turnover": 75000, "is_gst_registered": false},
      "expected_verdict": "non_compliant"
    },
    {
      "name": "at_threshold_exactly",
      "inputs": {"annual_turnover": 60000, "is_gst_registered": false},
      "expected_verdict": "non_compliant"
    },
    {
      "name": "above_threshold_registered",
      "inputs": {"annual_turnover": 100000, "is_gst_registered": true},
      "expected_verdict": "compliant"
    },
    {
      "name": "missing_turnover_data",
      "inputs": {"is_gst_registered": false},
      "expected_verdict": "insufficient_data"
    }
  ]
}
```

CI runs all test cases on every rules-engine PR. Below 95% pass rate → PR blocked.

---

## 13. Groundbreaking Features Powered by the Rules Engine

These are the features the rules engine unlocks. They are what differentiates Atlas from competitors.

| Feature | What it does | Key rules |
|---|---|---|
| **Compliance Score & Heat Map** | Real-time 0–100 score, green/amber/red across all areas, trend lines | All rules; weighted by severity |
| **Regulation Radar** | Monitors `legislation.govt.nz` and Federal Register for upcoming changes; translates legalese into plain-English impact summaries | Triggered by gazette monitor |
| **Compliance Time Machine** | Retroactive audit using the rules active at the historical date — the killer onboarding feature | Versioned rules with `effective_from`/`effective_to` |
| **Licence Chain Verification** | Before scheduling a worker to a job, verify every licence in the chain is current and class-appropriate | `nz.licensing.*` + `au.{state}.licensing.*` |
| **AI Site Risk Scanner** | Pulls building age, flood zone, seismic zone, powerlines proximity from address; pre-populates risk assessment | Triggers `nz.hsaw.notifiable_work_detected`, `au.whs.hrcw.*` |
| **AI SWMS Generator** | Generates SWMS from job scope using AI + deterministic safety rules — not generic boilerplate | `au.whs.hrcw.*` + AI generation node |
| **CCC Countdown** | Live checklist showing what documentation is outstanding for Code Compliance Certificate | `nz.building.ccc_checklist_progress` (composite) |
| **Cross-State Licence Mapping** | For AU tradies working across borders: maps licences across jurisdictions, alerts on mutual-recognition gaps | `au.{state}.licensing.*` |
| **Crisis Playbooks** | Pre-built regulation-aware playbooks: data breach, employee termination, tax audit prep, workplace accident | Composite rules per playbook |

---

*Atlas AI · Compliance v1.0 · May 2026 · Confidential*
