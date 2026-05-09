#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KUBECONFORM_BIN="${KUBECONFORM_BIN:-kubeconform}"
cd "$ROOT_DIR"

yamllint -f parsable dns-records

"$KUBECONFORM_BIN" \
  -strict \
  -schema-location default \
  -schema-location "schemas/{{.ResourceKind}}-{{.Group}}-{{.ResourceAPIVersion}}.json" \
  dns-records
