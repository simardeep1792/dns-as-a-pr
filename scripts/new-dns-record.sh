#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/new-dns-record.sh --subdomain NAME --type TYPE --target VALUE [--target VALUE ...] [--ttl 300] [--owner OWNER] [--project-name NAME] [--project-id ID] [--controlled-by VALUE] [--source-repo URL]

Examples:
  scripts/new-dns-record.sh --subdomain blog --type A --target 203.0.113.10 --owner platform --project-name dns-platform --project-id edip-aurora-fgc
  scripts/new-dns-record.sh --subdomain app --type CNAME --target app.example.net. --owner platform
  scripts/new-dns-record.sh --subdomain project --type NS --target ns-cloud-a1.googledomains.com --target ns-cloud-a2.googledomains.com --owner platform

This script only writes DNSEndpoint YAML. It does not create branches, pull requests, or DNS records directly.
USAGE
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBDOMAIN=""
RECORD_TYPE=""
TTL="300"
OWNER="platform"
PROJECT_NAME="dns-platform"
PROJECT_ID="edip-aurora-fgc"
CONTROLLED_BY="dns-as-a-pr"
SOURCE_REPO="https://github.com/simardeep1792/dns-as-a-pr"
TARGETS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --subdomain)
      SUBDOMAIN="${2:-}"
      shift 2
      ;;
    --type)
      RECORD_TYPE="${2:-}"
      shift 2
      ;;
    --target)
      TARGETS+=("${2:-}")
      shift 2
      ;;
    --ttl)
      TTL="${2:-}"
      shift 2
      ;;
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --project-name)
      PROJECT_NAME="${2:-}"
      shift 2
      ;;
    --project-id)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --controlled-by)
      CONTROLLED_BY="${2:-}"
      shift 2
      ;;
    --source-repo)
      SOURCE_REPO="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SUBDOMAIN" || -z "$RECORD_TYPE" || ${#TARGETS[@]} -eq 0 ]]; then
  usage >&2
  exit 1
fi

if [[ ! "$SUBDOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo "subdomain must be a single DNS label using lowercase letters, numbers, and hyphens" >&2
  exit 1
fi

case "$RECORD_TYPE" in
  A|AAAA|CNAME|TXT|NS) ;;
  *)
    echo "record type must be one of: A, AAAA, CNAME, TXT, NS" >&2
    exit 1
    ;;
esac

if [[ ! "$TTL" =~ ^[0-9]+$ || "$TTL" -lt 60 || "$TTL" -gt 86400 ]]; then
  echo "ttl must be an integer between 60 and 86400" >&2
  exit 1
fi

if [[ "$RECORD_TYPE" == "NS" && ${#TARGETS[@]} -lt 2 ]]; then
  echo "NS records require at least two targets" >&2
  exit 1
fi

DNS_NAME="$SUBDOMAIN.simardeep.xyz"
RESOURCE_NAME="${SUBDOMAIN//./-}-simardeep-xyz"
OUTPUT_FILE="$ROOT_DIR/dns-records/$DNS_NAME.yaml"

if [[ -e "$OUTPUT_FILE" ]]; then
  echo "refusing to overwrite existing file: $OUTPUT_FILE" >&2
  exit 1
fi

{
  cat <<YAML
apiVersion: externaldns.k8s.io/v1alpha1
kind: DNSEndpoint
metadata:
  name: $RESOURCE_NAME
  namespace: dns
  annotations:
    simardeep.xyz/source-repository: "$SOURCE_REPO"
    simardeep.xyz/zone-scope: "simardeep-xyz"
  labels:
    simardeep.xyz/controlled-by: "$CONTROLLED_BY"
    simardeep.xyz/project-name: "$PROJECT_NAME"
    simardeep.xyz/project-id: "$PROJECT_ID"
    simardeep.xyz/owner: "$OWNER"
spec:
  endpoints:
    - dnsName: $DNS_NAME
      recordType: $RECORD_TYPE
      recordTTL: $TTL
      targets:
YAML

  for target in "${TARGETS[@]}"; do
    printf '        - %s\n' "$target"
  done
} > "$OUTPUT_FILE"

echo "created $OUTPUT_FILE"
