"""Atlas AI — Compliance Rules Engine.

The LLM never decides whether something is compliant.
Deterministic rules decide; the LLM only explains the verdict in plain English.

Rule lifecycle:
  1. Rules are JSON documents matching the schema in COMPLIANCE.md §2.
  2. register_rule() validates and stores them in the in-memory registry.
  3. evaluate() runs the correct evaluator for the rule's evaluation.type.
  4. evaluate_all() runs every applicable rule for a jurisdiction and returns results.
  5. compute_score() converts results to the 0–100 weighted compliance score.

Phase 0: registry is empty, evaluators are not yet registered.
         This module proves the interface compiles; rules ship in Phase 3.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol, runtime_checkable

import structlog

logger = structlog.get_logger(__name__)

# ── Verdict ───────────────────────────────────────────────────────────────────

class Verdict(str, Enum):
    COMPLIANT          = "compliant"
    NON_COMPLIANT      = "non_compliant"
    NEEDS_ATTENTION    = "needs_attention"
    INSUFFICIENT_DATA  = "insufficient_data"


# Score contribution per verdict — see COMPLIANCE.md §5.
VERDICT_SCORES: dict[Verdict, float] = {
    Verdict.COMPLIANT:         1.0,
    Verdict.NEEDS_ATTENTION:   0.5,
    Verdict.INSUFFICIENT_DATA: 0.3,
    Verdict.NON_COMPLIANT:     0.0,
}

# Severity weights — see COMPLIANCE.md §6.
SEVERITY_WEIGHTS: dict[str, int] = {
    "critical":  3,
    "important": 2,
    "advisory":  1,
}

# Required fields in every rule definition — see COMPLIANCE.md §2.
_REQUIRED_RULE_FIELDS: frozenset[str] = frozenset({
    "rule_id",
    "jurisdiction",
    "category",
    "version",
    "effective_from",
    "severity",
    "legislation_ref",
    "inputs",
    "evaluation",
})


# ── Result ────────────────────────────────────────────────────────────────────

@dataclass
class EvaluationResult:
    rule_id:      str
    rule_version: str
    verdict:      Verdict
    score:        float
    message:      str
    remediation:  str | None
    inputs_used:  dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.score = VERDICT_SCORES[self.verdict]


# ── Evaluator protocol ────────────────────────────────────────────────────────

@runtime_checkable
class RuleEvaluator(Protocol):
    """Contract that every evaluation-type handler must satisfy."""

    def evaluate(
        self,
        rule: dict[str, Any],
        inputs: dict[str, Any],
    ) -> EvaluationResult:
        """Evaluate one rule definition against the provided inputs."""
        ...


# ── Engine ────────────────────────────────────────────────────────────────────

class RulesEngine:
    """Deterministic, jurisdiction-aware compliance rules engine.

    Rules are data (JSON), not code. Non-engineers can review and update them.
    The engine is evaluator-pluggable: each evaluation.type maps to a handler.
    No LLM calls happen inside this class — only the caller's explanation step uses the LLM.
    """

    def __init__(self) -> None:
        # rule_id -> full rule definition dict
        self._registry: dict[str, dict[str, Any]] = {}
        # evaluation.type -> evaluator instance
        self._evaluators: dict[str, RuleEvaluator] = {}

    # ── Registration ──────────────────────────────────────────────────────────

    def register_rule(self, rule: dict[str, Any]) -> None:
        """Validate and register a rule. Raises ValueError for malformed rules."""
        missing = _REQUIRED_RULE_FIELDS - set(rule.keys())
        if missing:
            raise ValueError(f"Rule '{rule.get('rule_id', '?')}' missing fields: {missing}")

        rule_id = rule["rule_id"]
        self._registry[rule_id] = rule
        logger.debug("rule_registered", rule_id=rule_id, version=rule["version"])

    def register_evaluator(self, eval_type: str, evaluator: RuleEvaluator) -> None:
        """Register an evaluator for a given evaluation.type string."""
        if not isinstance(evaluator, RuleEvaluator):
            raise TypeError(f"Evaluator for '{eval_type}' does not satisfy RuleEvaluator protocol")
        self._evaluators[eval_type] = evaluator
        logger.debug("evaluator_registered", eval_type=eval_type)

    # ── Evaluation ────────────────────────────────────────────────────────────

    def evaluate(self, rule_id: str, inputs: dict[str, Any]) -> EvaluationResult:
        """Evaluate a single rule against inputs. Raises KeyError if unknown."""
        if rule_id not in self._registry:
            raise KeyError(f"Rule not registered: {rule_id}")

        rule = self._registry[rule_id]
        eval_type: str = rule["evaluation"]["type"]

        if eval_type not in self._evaluators:
            raise NotImplementedError(
                f"No evaluator registered for type '{eval_type}' "
                f"(required by rule '{rule_id}')"
            )

        result = self._evaluators[eval_type].evaluate(rule, inputs)
        logger.info(
            "rule_evaluated",
            rule_id=rule_id,
            rule_version=rule["version"],
            verdict=result.verdict,
        )
        return result

    def evaluate_all(
        self,
        jurisdiction: str,
        inputs: dict[str, Any],
        as_of_date: str | None = None,
    ) -> list[EvaluationResult]:
        """Evaluate all active rules for a jurisdiction.

        as_of_date: ISO date string (YYYY-MM-DD). Rules with effective_to before
                    this date are skipped, enabling historical audits.
        """
        applicable = [
            rule for rule in self._registry.values()
            if rule["jurisdiction"] == jurisdiction
            and (as_of_date is None or rule["effective_from"] <= as_of_date)
            and (rule.get("effective_to") is None or (as_of_date or "") <= rule["effective_to"])
        ]

        results: list[EvaluationResult] = []
        for rule in applicable:
            try:
                results.append(self.evaluate(rule["rule_id"], inputs))
            except (KeyError, NotImplementedError) as exc:
                logger.warning("rule_skipped", rule_id=rule["rule_id"], reason=str(exc))

        return results

    # ── Scoring ───────────────────────────────────────────────────────────────

    def compute_score(self, results: list[EvaluationResult]) -> float:
        """Compute the 0–100 weighted compliance score per COMPLIANCE.md §6.

        Score = (Σ weight × verdict_score) / (Σ weights) × 100
        """
        if not results:
            return 100.0

        total_weight: float = 0.0
        weighted_sum: float = 0.0

        for result in results:
            rule = self._registry.get(result.rule_id, {})
            weight = float(SEVERITY_WEIGHTS.get(rule.get("severity", "advisory"), 1))
            total_weight += weight
            weighted_sum += weight * result.score

        if total_weight == 0.0:
            return 100.0

        return round((weighted_sum / total_weight) * 100, 2)


# Global engine instance — evaluators and rules are registered at startup.
engine = RulesEngine()
