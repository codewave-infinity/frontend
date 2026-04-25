"""SecureShare Sigma Rule Generator.

Transforms structured threat reports into vendor-agnostic Sigma detection
rules in YAML, ready for ingestion by Splunk / Elastic / Wazuh / the
SecureShare gateway.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Any

import yaml


# Fixed namespace for UUIDv5 derivation. Generated once; never change it
# without a migration plan, otherwise rule IDs from before/after diverge.
SECURESHARE_NAMESPACE = uuid.UUID("6f4d8e6a-7b18-4c9c-8b6e-7d5a3f1e2c4d")


class IndicatorType(str, Enum):
    DOMAIN = "domain"
    IPV4 = "ipv4"
    IPV6 = "ipv6"
    URL = "url"
    FILE_HASH_SHA256 = "file_hash_sha256"
    FILE_HASH_MD5 = "file_hash_md5"
    JA4 = "ja4"
    EMAIL_SENDER = "email_sender"


class ThreatType(str, Enum):
    PHISHING = "phishing"
    MALWARE_C2 = "malware_c2"
    RANSOMWARE = "ransomware"
    DATA_EXFILTRATION = "data_exfiltration"
    BRUTE_FORCE = "brute_force"
    CREDENTIAL_THEFT = "credential_theft"
    BOTNET = "botnet"


class Severity(str, Enum):
    INFORMATIONAL = "informational"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Indicator:
    type: IndicatorType
    value: str


@dataclass
class ThreatReport:
    threat_type: ThreatType
    indicators: list[Indicator]
    severity: Severity
    description: str
    anonymous_reporter_id: str
    reporter_credibility: float
    report_id: str


_INDICATOR_TEMPLATES: dict[IndicatorType, dict[str, Any]] = {
    IndicatorType.DOMAIN: {
        "logsource": {"category": "dns"},
        "selection_key": "selection_domain",
        "field": "query|endswith",
    },
    IndicatorType.IPV4: {
        "logsource": {"category": "network_connection"},
        "selection_key": "selection_ipv4",
        "field": "DestinationIp",
    },
    IndicatorType.IPV6: {
        "logsource": {"category": "network_connection"},
        "selection_key": "selection_ipv6",
        "field": "DestinationIp",
    },
    IndicatorType.URL: {
        "logsource": {"category": "proxy"},
        "selection_key": "selection_url",
        "field": "c-uri|contains",
    },
    IndicatorType.FILE_HASH_SHA256: {
        "logsource": {"category": "file_event"},
        "selection_key": "selection_sha256",
        "field": "Hashes|contains",
    },
    IndicatorType.FILE_HASH_MD5: {
        "logsource": {"category": "file_event"},
        "selection_key": "selection_md5",
        "field": "Hashes|contains",
    },
    IndicatorType.JA4: {
        "logsource": {"category": "network_connection"},
        "selection_key": "selection_ja4",
        "field": "ja4",
    },
    IndicatorType.EMAIL_SENDER: {
        "logsource": {"category": "email"},
        "selection_key": "selection_email_sender",
        "field": "sender",
    },
}


_ATTACK_MAP: dict[ThreatType, dict[str, str]] = {
    ThreatType.PHISHING: {"tactic": "initial_access", "technique": "t1566.002"},
    ThreatType.MALWARE_C2: {"tactic": "command_and_control", "technique": "t1071.001"},
    ThreatType.RANSOMWARE: {"tactic": "impact", "technique": "t1486"},
    ThreatType.DATA_EXFILTRATION: {"tactic": "exfiltration", "technique": "t1041"},
    ThreatType.BRUTE_FORCE: {"tactic": "credential_access", "technique": "t1110"},
    ThreatType.CREDENTIAL_THEFT: {"tactic": "credential_access", "technique": "t1003"},
    ThreatType.BOTNET: {"tactic": "command_and_control", "technique": "t1071"},
}


_VALID_SIGMA_LEVELS = {"informational", "low", "medium", "high", "critical"}


class SigmaGenerator:
    """Generate Sigma rules from SecureShare threat reports."""

    def __init__(self, base_url: str = "https://secureshare.np") -> None:
        self.base_url = base_url

    def generate_dict(self, report: ThreatReport) -> dict[str, Any]:
        if not report.indicators:
            raise ValueError("Threat report must contain at least one indicator")
        if not (0.0 <= report.reporter_credibility <= 1.0):
            raise ValueError("reporter_credibility must be between 0.0 and 1.0")

        unique = sorted({(ind.type.value, ind.value) for ind in report.indicators})
        indicators = [Indicator(IndicatorType(t), v) for t, v in unique]

        rule_id = self._derive_uuid(report, indicators)
        logsource = self._pick_logsource(indicators)
        detection = self._build_detection(indicators)

        rule: dict[str, Any] = {
            "title": self._title(report, len(indicators)),
            "id": str(rule_id),
            "status": "experimental",
            "description": self._description(report, indicators),
            "references": [f"{self.base_url}/reports/{report.report_id}"],
            "author": (
                f"SecureShare Auto-Generator (reporter: "
                f"{report.anonymous_reporter_id})"
            ),
            "date": date.today().strftime("%Y/%m/%d"),
            "logsource": logsource,
            "detection": detection,
            "falsepositives": [self._fp_guidance(report)],
            "level": report.severity.value,
            "tags": self._tags(report),
        }
        return rule

    def generate(self, report: ThreatReport) -> str:
        rule = self.generate_dict(report)
        return yaml.safe_dump(
            rule,
            sort_keys=False,
            default_flow_style=False,
            allow_unicode=True,
        )

    @staticmethod
    def _derive_uuid(
        report: ThreatReport, indicators: list[Indicator]
    ) -> uuid.UUID:
        sig = "|".join(
            [
                report.threat_type.value,
                report.severity.value,
                report.report_id,
                *(f"{ind.type.value}={ind.value}" for ind in indicators),
            ]
        )
        return uuid.uuid5(SECURESHARE_NAMESPACE, sig)

    @staticmethod
    def _pick_logsource(indicators: list[Indicator]) -> dict[str, str]:
        # Indicators are already sorted by type+value, so the chosen primary
        # is deterministic across calls with the same inputs.
        primary = indicators[0]
        return dict(_INDICATOR_TEMPLATES[primary.type]["logsource"])

    @staticmethod
    def _build_detection(indicators: list[Indicator]) -> dict[str, Any]:
        grouped: dict[IndicatorType, list[str]] = {}
        for ind in indicators:
            grouped.setdefault(ind.type, []).append(ind.value)

        selections: dict[str, Any] = {}
        for itype, values in grouped.items():
            tmpl = _INDICATOR_TEMPLATES[itype]
            selections[tmpl["selection_key"]] = {
                tmpl["field"]: sorted(set(values))
            }

        keys = list(selections.keys())
        condition = keys[0] if len(keys) == 1 else " or ".join(keys)
        detection: dict[str, Any] = dict(selections)
        detection["condition"] = condition
        return detection

    def _description(
        self, report: ThreatReport, indicators: list[Indicator]
    ) -> str:
        body = report.description.strip()
        if not body.endswith("."):
            body += "."
        suffix = (
            f" Reported anonymously by {report.anonymous_reporter_id} "
            f"(credibility: {report.reporter_credibility:.2f})."
        )
        types = {ind.type for ind in indicators}
        if len(types) > 1:
            suffix += (
                " NOTE: This report contains indicators of mixed log-source "
                "types; the rule uses the primary log source. Consumers may "
                "want to split per-type for full coverage."
            )
        return f"{body}{suffix}"

    @staticmethod
    def _title(report: ThreatReport, n: int) -> str:
        label = report.threat_type.value.replace("_", " ").title()
        plural = "Indicator" if n == 1 else "Indicators"
        return f"SecureShare {label} Detection — {n} {plural}"

    @staticmethod
    def _credibility_band(score: float) -> str:
        if score >= 0.7:
            return "high"
        if score >= 0.4:
            return "medium"
        return "low"

    def _fp_guidance(self, report: ThreatReport) -> str:
        band = self._credibility_band(report.reporter_credibility)
        threat = report.threat_type.value.replace("_", " ")
        if band == "high":
            return (
                f"Unlikely — {threat} indicators with high reporter "
                f"credibility."
            )
        if band == "medium":
            return (
                f"Possible — {threat} indicators with medium reporter "
                f"credibility; review hits before action."
            )
        return (
            f"Possible legitimate traffic — verify before blocking. "
            f"Source has low historical credibility for {threat} reports."
        )

    def _tags(self, report: ThreatReport) -> list[str]:
        attk = _ATTACK_MAP[report.threat_type]
        band = self._credibility_band(report.reporter_credibility)
        return [
            f"attack.{attk['tactic']}",
            f"attack.{attk['technique']}",
            "secureshare.auto",
            f"secureshare.credibility.{band}",
            f"secureshare.threat.{report.threat_type.value}",
        ]


__all__ = [
    "SigmaGenerator",
    "ThreatReport",
    "Indicator",
    "IndicatorType",
    "ThreatType",
    "Severity",
    "SECURESHARE_NAMESPACE",
]
