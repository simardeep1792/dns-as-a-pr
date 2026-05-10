#!/usr/bin/env python3
"""Validate required DNS metadata contract for DNSEndpoint manifests."""

from pathlib import Path
import sys

import yaml


REQUIRED_LABELS = [
    "simardeep.xyz/controlled-by",
    "simardeep.xyz/project-name",
    "simardeep.xyz/project-id",
    "simardeep.xyz/owner",
]

REQUIRED_ANNOTATIONS = [
    "simardeep.xyz/source-repository",
    "simardeep.xyz/zone-scope",
]


def is_non_empty_string(value):
    return isinstance(value, str) and value.strip() != ""


def main():
    root = Path(__file__).resolve().parent.parent
    dns_dir = root / "dns-records"
    files = sorted(dns_dir.glob("*.yaml"))

    failures = []

    for file_path in files:
        with file_path.open("r", encoding="utf-8") as handle:
            doc = yaml.safe_load(handle)

        metadata = doc.get("metadata", {})
        labels = metadata.get("labels", {})
        annotations = metadata.get("annotations", {})

        for key in REQUIRED_LABELS:
            if not is_non_empty_string(labels.get(key)):
                failures.append(f"{file_path.name}: missing required label '{key}'")

        for key in REQUIRED_ANNOTATIONS:
            if not is_non_empty_string(annotations.get(key)):
                failures.append(f"{file_path.name}: missing required annotation '{key}'")

        zone_scope = annotations.get("simardeep.xyz/zone-scope", "")
        if zone_scope != "simardeep-xyz":
            failures.append(
                f"{file_path.name}: simardeep.xyz/zone-scope must be 'simardeep-xyz'"
            )

        endpoints = doc.get("spec", {}).get("endpoints", [])
        if not endpoints:
            failures.append(f"{file_path.name}: spec.endpoints must not be empty")
            continue

        for endpoint in endpoints:
            dns_name = endpoint.get("dnsName", "")
            if not dns_name.endswith(".simardeep.xyz"):
                failures.append(
                    f"{file_path.name}: dnsName '{dns_name}' must end with .simardeep.xyz"
                )

    if failures:
        for failure in failures:
            print(failure)
        sys.exit(1)


if __name__ == "__main__":
    main()
