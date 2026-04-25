"""Tests for SecureShare Sigma Rule Generator.

22 tests across the categories defined in §7 of the component doc:
  Basic shape & validity (5), Determinism (3), Per-indicator templates (4),
  Multi-indicator coalescing (3), MITRE & provenance tags (4),
  FP guidance (1), Error handling (1), Anonymity (1).
"""

from __future__ import annotations

import uuid

import pytest
import yaml

from sigma_generator import (
    Indicator,
    IndicatorType,
    Severity,
    SigmaGenerator,
    ThreatReport,
    ThreatType,
)


def _report(**overrides) -> ThreatReport:
    defaults = dict(
        threat_type=ThreatType.PHISHING,
        indicators=[Indicator(IndicatorType.DOMAIN, "esewa-verify.xyz")],
        severity=Severity.HIGH,
        description="Phishing campaign impersonating eSewa",
        anonymous_reporter_id="Bank-A7f3",
        reporter_credibility=0.88,
        report_id="rpt-2026-04-25-0001",
    )
    defaults.update(overrides)
    return ThreatReport(**defaults)


@pytest.fixture
def gen() -> SigmaGenerator:
    return SigmaGenerator()


# ---------------------------------------------------------------- Basic (5)

def test_generated_yaml_parses_back(gen):
    out = gen.generate(_report())
    parsed = yaml.safe_load(out)
    assert isinstance(parsed, dict)


def test_required_sigma_fields_present(gen):
    rule = gen.generate_dict(_report())
    for required in (
        "title", "id", "status", "description", "logsource",
        "detection", "level", "tags",
    ):
        assert required in rule, f"missing field: {required}"


def test_id_is_valid_uuid(gen):
    rule = gen.generate_dict(_report())
    parsed = uuid.UUID(rule["id"])
    assert parsed.version == 5


def test_level_is_valid_sigma_severity(gen):
    for sev in Severity:
        rule = gen.generate_dict(_report(severity=sev))
        assert rule["level"] in {"informational", "low", "medium", "high", "critical"}


def test_detection_has_condition_and_at_least_one_selection(gen):
    rule = gen.generate_dict(_report())
    detection = rule["detection"]
    assert "condition" in detection
    selections = [k for k in detection if k.startswith("selection_")]
    assert len(selections) >= 1


# ------------------------------------------------------------ Determinism (3)

def test_same_input_same_uuid(gen):
    a = gen.generate_dict(_report())
    b = gen.generate_dict(_report())
    assert a["id"] == b["id"]


def test_different_reports_different_uuids(gen):
    a = gen.generate_dict(_report(report_id="rpt-A"))
    b = gen.generate_dict(_report(report_id="rpt-B"))
    assert a["id"] != b["id"]


def test_indicator_order_does_not_matter(gen):
    inds_a = [
        Indicator(IndicatorType.DOMAIN, "a.example"),
        Indicator(IndicatorType.DOMAIN, "b.example"),
    ]
    inds_b = list(reversed(inds_a))
    a = gen.generate_dict(_report(indicators=inds_a))
    b = gen.generate_dict(_report(indicators=inds_b))
    assert a["id"] == b["id"]
    assert a["detection"] == b["detection"]


# --------------------------------------------------- Per-indicator templates (4)

def test_domain_uses_dns_logsource(gen):
    rule = gen.generate_dict(
        _report(indicators=[Indicator(IndicatorType.DOMAIN, "x.test")])
    )
    assert rule["logsource"] == {"category": "dns"}
    assert "selection_domain" in rule["detection"]
    assert "query|endswith" in rule["detection"]["selection_domain"]


def test_ipv4_uses_network_connection_logsource(gen):
    rule = gen.generate_dict(
        _report(
            threat_type=ThreatType.MALWARE_C2,
            indicators=[Indicator(IndicatorType.IPV4, "45.100.1.23")],
        )
    )
    assert rule["logsource"] == {"category": "network_connection"}
    assert rule["detection"]["selection_ipv4"] == {
        "DestinationIp": ["45.100.1.23"]
    }


def test_sha256_uses_file_event_logsource(gen):
    rule = gen.generate_dict(
        _report(
            threat_type=ThreatType.RANSOMWARE,
            indicators=[
                Indicator(IndicatorType.FILE_HASH_SHA256, "a" * 64),
            ],
        )
    )
    assert rule["logsource"] == {"category": "file_event"}
    assert "selection_sha256" in rule["detection"]
    assert "Hashes|contains" in rule["detection"]["selection_sha256"]


def test_ja4_uses_network_connection_with_ja4_field(gen):
    fp = "t13d1516h2_8daaf6152771_e5627efa2ab1"
    rule = gen.generate_dict(
        _report(
            threat_type=ThreatType.MALWARE_C2,
            indicators=[Indicator(IndicatorType.JA4, fp)],
        )
    )
    assert rule["logsource"] == {"category": "network_connection"}
    assert rule["detection"]["selection_ja4"] == {"ja4": [fp]}


# --------------------------------------------- Multi-indicator coalescing (3)

def test_same_type_indicators_merge_into_single_selection(gen):
    rule = gen.generate_dict(
        _report(
            indicators=[
                Indicator(IndicatorType.DOMAIN, "a.test"),
                Indicator(IndicatorType.DOMAIN, "b.test"),
                Indicator(IndicatorType.DOMAIN, "c.test"),
            ]
        )
    )
    selections = [k for k in rule["detection"] if k.startswith("selection_")]
    assert selections == ["selection_domain"]
    assert rule["detection"]["selection_domain"]["query|endswith"] == [
        "a.test", "b.test", "c.test",
    ]
    assert rule["detection"]["condition"] == "selection_domain"


def test_mixed_types_use_or_condition(gen):
    rule = gen.generate_dict(
        _report(
            threat_type=ThreatType.MALWARE_C2,
            indicators=[
                Indicator(IndicatorType.IPV4, "45.100.1.23"),
                Indicator(
                    IndicatorType.JA4,
                    "t13d1516h2_8daaf6152771_e5627efa2ab1",
                ),
            ],
        )
    )
    assert "selection_ipv4" in rule["detection"]
    assert "selection_ja4" in rule["detection"]
    cond = rule["detection"]["condition"]
    assert "or" in cond
    assert "selection_ipv4" in cond and "selection_ja4" in cond


def test_duplicate_indicators_are_deduped(gen):
    rule = gen.generate_dict(
        _report(
            indicators=[
                Indicator(IndicatorType.DOMAIN, "dup.test"),
                Indicator(IndicatorType.DOMAIN, "dup.test"),
                Indicator(IndicatorType.DOMAIN, "dup.test"),
            ]
        )
    )
    assert rule["detection"]["selection_domain"]["query|endswith"] == [
        "dup.test"
    ]


# ------------------------------------------ MITRE & provenance tags (4)

def test_attack_tactic_and_technique_tags_present(gen):
    rule = gen.generate_dict(_report(threat_type=ThreatType.PHISHING))
    assert "attack.initial_access" in rule["tags"]
    assert "attack.t1566.002" in rule["tags"]


def test_secureshare_metadata_tags_present(gen):
    rule = gen.generate_dict(_report())
    assert "secureshare.auto" in rule["tags"]
    assert any(t.startswith("secureshare.threat.") for t in rule["tags"])
    assert any(t.startswith("secureshare.credibility.") for t in rule["tags"])


def test_credibility_band_high_when_score_above_threshold(gen):
    rule = gen.generate_dict(_report(reporter_credibility=0.85))
    assert "secureshare.credibility.high" in rule["tags"]


def test_credibility_band_low_when_score_below_threshold(gen):
    rule = gen.generate_dict(_report(reporter_credibility=0.2))
    assert "secureshare.credibility.low" in rule["tags"]


# ------------------------------------------------------------- FP guidance (1)

def test_low_credibility_triggers_cautious_fp_wording(gen):
    rule = gen.generate_dict(_report(reporter_credibility=0.15))
    fps = rule["falsepositives"]
    assert any("verify" in fp.lower() for fp in fps)
    assert any("low" in fp.lower() for fp in fps)


# ---------------------------------------------------------- Error handling (1)

def test_empty_indicators_raises_value_error(gen):
    with pytest.raises(ValueError):
        gen.generate_dict(_report(indicators=[]))


# ----------------------------------------------------------------- Anonymity (1)

def test_no_real_org_names_in_output(gen):
    forbidden = ("NIC Asia", "Nabil Bank", "Standard Chartered", "NTC", "Ncell")
    out = gen.generate(_report())
    for name in forbidden:
        assert name not in out, f"leaked org name: {name}"
    assert "Bank-A7f3" in out
