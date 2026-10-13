"""Regression tests for CSV input, sensitive inputs and administrative access."""
import csv
import pytest
from fastapi import HTTPException

from input_parsing import parse_boolean
from cli import main as primary_main
from flux_balance.cli import main as secondary_main
from agents.api import api_audit_logs, api_audit
from agents.base import SecurityException
from agents.models import SystemTaskPayload
from agents.supervisor import SystemSupervisor


@pytest.mark.parametrize(("raw", "expected"), [
    ("False", False), ("FALSE", False), ("0", False), ("no", False),
    ("", False), ("True", True), ("TRUE", True), ("1", True), ("yes", True),
])
def test_boolean_parser(raw, expected):
    assert parse_boolean(raw) is expected


def test_boolean_parser_rejects_unknown():
    with pytest.raises(ValueError, match="Invalid boolean"):
        parse_boolean("maybe")


@pytest.mark.parametrize(("runner", "status_field", "critical_value"), [
    (primary_main, "overall_urgency", "CRITICAL_STAT_PANIC"),
    (secondary_main, "overall_status", "CRITICAL_INTERVENTION_REQUIRED"),
])
def test_batch_parses_false_and_true(tmp_path, runner, status_field, critical_value):
    source, result = tmp_path / "input.csv", tmp_path / "output.csv"
    with source.open("w", newline="", encoding="utf8") as stream:
        writer = csv.DictWriter(stream, fieldnames=[
            "task_id", "target_identifier", "primary_metric", "secondary_metric",
            "status_descriptor", "is_critical_flag",
        ])
        writer.writeheader()
        for flag in ("False", "True"):
            writer.writerow(dict(task_id="T-" + flag, target_identifier="KEY-01",
                                 primary_metric="5", secondary_metric="2",
                                 status_descriptor="NOMINAL", is_critical_flag=flag))
    assert runner(["batch", "-i", str(source), "-o", str(result)]) == 0
    with result.open(newline="", encoding="utf8") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 2
    assert rows[0][status_field] != critical_value
    assert rows[1][status_field] == critical_value


def test_nested_metadata_rejects_sensitive_identifier():
    payload = SystemTaskPayload(task_id="T1", target_identifier="KEY-01",
                                primary_metric=1, attributes={"nested": {"note": "MRN-994827"}})
    with pytest.raises(SecurityException):
        SystemSupervisor().process_task(payload)


def test_api_returns_generic_validation_error():
    payload = SystemTaskPayload(task_id="T1", target_identifier="KEY-01",
                                primary_metric=1, attributes={"email": "someone@example.com"})
    with pytest.raises(HTTPException) as exc:
        api_audit(payload)
    assert exc.value.status_code == 422
    assert "someone@example.com" not in str(exc.value.detail)


def test_audit_log_endpoint_requires_token(monkeypatch):
    monkeypatch.delenv("AUDIT_LOG_READ_TOKEN", raising=False)
    with pytest.raises(HTTPException) as exc:
        api_audit_logs(authorization=None)
    assert exc.value.status_code == 503
    monkeypatch.setenv("AUDIT_LOG_READ_TOKEN", "test-token-for-access")
    with pytest.raises(HTTPException) as exc:
        api_audit_logs(authorization="Bearer wrong")
    assert exc.value.status_code == 401
    assert api_audit_logs(authorization="Bearer test-token-for-access")["verified"] is True


def test_legacy_model_rejects_nonfinite_metrics():
    from flux_balance.models import FrontierPayload
    with pytest.raises(ValueError, match="finite"):
        FrontierPayload("T", "K", float("nan"), 2, "NOMINAL")


def test_mock_provider_does_not_claim_scientific_verification():
    from agents.llm_factory import LLMFactory
    response = LLMFactory.create("mock").invoke("What is FBA?")
    assert "No model or scientific validation was performed" in response
    with pytest.raises(NotImplementedError):
        LLMFactory.create("openai")


def test_simulator_rejects_zero_iterations():
    from simulator import run_simulation
    with pytest.raises(ValueError, match="positive"):
        run_simulation(0)
