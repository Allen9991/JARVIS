"""Smoke tests for the rules engine.

These tests verify the engine interface — they do not test rule correctness
(that comes in Phase 3 when real rules are registered).
"""

import pytest

from rules.engine import (
    EvaluationResult,
    RulesEngine,
    Verdict,
    VERDICT_SCORES,
)


@pytest.fixture()
def engine() -> RulesEngine:
    return RulesEngine()


@pytest.fixture()
def minimal_rule() -> dict:
    return {
        "rule_id": "test.smoke.threshold",
        "jurisdiction": "NZ",
        "category": "test",
        "version": "1.0",
        "effective_from": "2026-01-01",
        "effective_to": None,
        "severity": "critical",
        "title": "Smoke test rule",
        "legislation_ref": "Test Act 2026, s1",
        "inputs": [{"name": "value", "type": "number", "source": "manual"}],
        "evaluation": {"type": "threshold", "condition": "value >= 100"},
    }


class TestRegistration:
    def test_register_valid_rule(self, engine: RulesEngine, minimal_rule: dict) -> None:
        engine.register_rule(minimal_rule)
        assert "test.smoke.threshold" in engine._registry

    def test_register_rule_missing_fields_raises(self, engine: RulesEngine) -> None:
        with pytest.raises(ValueError, match="missing fields"):
            engine.register_rule({"rule_id": "incomplete"})

    def test_register_evaluator(self, engine: RulesEngine) -> None:
        class FakeEvaluator:
            def evaluate(self, rule, inputs):
                return EvaluationResult(
                    rule_id=rule["rule_id"],
                    rule_version=rule["version"],
                    verdict=Verdict.COMPLIANT,
                    score=VERDICT_SCORES[Verdict.COMPLIANT],
                    message="ok",
                    remediation=None,
                )

        engine.register_evaluator("threshold", FakeEvaluator())
        assert "threshold" in engine._evaluators


class TestEvaluation:
    def test_evaluate_unknown_rule_raises(self, engine: RulesEngine) -> None:
        with pytest.raises(KeyError, match="not registered"):
            engine.evaluate("nonexistent.rule", {})

    def test_evaluate_unknown_eval_type_raises(
        self, engine: RulesEngine, minimal_rule: dict
    ) -> None:
        engine.register_rule(minimal_rule)
        with pytest.raises(NotImplementedError, match="No evaluator"):
            engine.evaluate("test.smoke.threshold", {"value": 50})

    def test_evaluate_all_empty_registry(self, engine: RulesEngine) -> None:
        results = engine.evaluate_all("NZ", {})
        assert results == []

    def test_evaluate_all_skips_wrong_jurisdiction(
        self, engine: RulesEngine, minimal_rule: dict
    ) -> None:
        engine.register_rule(minimal_rule)  # jurisdiction = NZ
        results = engine.evaluate_all("AU", {})
        assert results == []


class TestScoring:
    def test_compute_score_no_results_is_100(self, engine: RulesEngine) -> None:
        assert engine.compute_score([]) == 100.0

    def test_compute_score_all_compliant_is_100(
        self, engine: RulesEngine, minimal_rule: dict
    ) -> None:
        engine.register_rule(minimal_rule)
        results = [
            EvaluationResult(
                rule_id="test.smoke.threshold",
                rule_version="1.0",
                verdict=Verdict.COMPLIANT,
                score=VERDICT_SCORES[Verdict.COMPLIANT],
                message="ok",
                remediation=None,
            )
        ]
        assert engine.compute_score(results) == 100.0

    def test_compute_score_non_compliant_critical_drops_significantly(
        self, engine: RulesEngine, minimal_rule: dict
    ) -> None:
        engine.register_rule(minimal_rule)
        results = [
            EvaluationResult(
                rule_id="test.smoke.threshold",
                rule_version="1.0",
                verdict=Verdict.NON_COMPLIANT,
                score=VERDICT_SCORES[Verdict.NON_COMPLIANT],
                message="failed",
                remediation="fix it",
            )
        ]
        score = engine.compute_score(results)
        assert score == 0.0

    def test_verdict_scores_are_correct(self) -> None:
        assert VERDICT_SCORES[Verdict.COMPLIANT]         == 1.0
        assert VERDICT_SCORES[Verdict.NEEDS_ATTENTION]   == 0.5
        assert VERDICT_SCORES[Verdict.INSUFFICIENT_DATA] == 0.3
        assert VERDICT_SCORES[Verdict.NON_COMPLIANT]     == 0.0
