#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="edip-aurora-fgc"
ZONE="simardeep-xyz"
AUTHORITATIVE_NS="ns-cloud-e1.googledomains.com"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"

  if [[ "$haystack" != *"$needle"* ]]; then
    echo "failed: $label" >&2
    echo "expected to find: $needle" >&2
    exit 1
  fi
}

require kubectl
require gcloud
require dig

echo "== ArgoCD apps =="
kubectl -n argocd get applications.argoproj.io

apps=$(kubectl -n argocd get applications.argoproj.io -o jsonpath='{range .items[*]}{.metadata.name} {.status.sync.status} {.status.health.status}{"\n"}{end}')
assert_contains "$apps" "simardeep-platform Synced Healthy" "root app synced and healthy"
assert_contains "$apps" "external-dns Synced Healthy" "external-dns app synced and healthy"
assert_contains "$apps" "dns-records Synced Healthy" "dns-records app synced and healthy"

echo "== DNSEndpoints =="
kubectl -n dns get dnsendpoints.externaldns.k8s.io

endpoints=$(kubectl -n dns get dnsendpoints.externaldns.k8s.io -o name)
assert_contains "$endpoints" "dnsendpoint.externaldns.k8s.io/gitops-test-simardeep-xyz" "A record DNSEndpoint exists"
assert_contains "$endpoints" "dnsendpoint.externaldns.k8s.io/test-simardeep-xyz" "TXT record DNSEndpoint exists"
assert_contains "$endpoints" "dnsendpoint.externaldns.k8s.io/delegation-test-simardeep-xyz" "NS delegation DNSEndpoint exists"

echo "== ExternalDNS args =="
args=$(kubectl -n external-dns get deploy external-dns -o jsonpath='{.spec.template.spec.containers[0].args}')
assert_contains "$args" "--source=crd" "ExternalDNS uses CRD source"
assert_contains "$args" "--domain-filter=simardeep.xyz" "ExternalDNS filters simardeep.xyz"
assert_contains "$args" "--google-zone-visibility=public" "ExternalDNS filters public Cloud DNS zones"
assert_contains "$args" "--managed-record-types=A" "ExternalDNS manages A records"
assert_contains "$args" "--managed-record-types=TXT" "ExternalDNS manages TXT records"
assert_contains "$args" "--managed-record-types=NS" "ExternalDNS manages NS records"

echo "== Cloud DNS records =="
records=$(gcloud dns record-sets list --zone "$ZONE" --project "$PROJECT_ID")
assert_contains "$records" "gitops-test-a.simardeep.xyz." "Cloud DNS has A smoke record"
assert_contains "$records" "test.simardeep.xyz." "Cloud DNS has TXT smoke record"
assert_contains "$records" "delegation-test.simardeep.xyz." "Cloud DNS has NS delegation smoke record"
assert_contains "$records" "edns-a-gitops-test-a.simardeep.xyz." "Cloud DNS has A ownership TXT"
assert_contains "$records" "edns-txt-test.simardeep.xyz." "Cloud DNS has TXT ownership TXT"
assert_contains "$records" "edns-ns-delegation-test.simardeep.xyz." "Cloud DNS has NS ownership TXT"

echo "== Authoritative DNS resolution =="
a_record=$(dig +short "@$AUTHORITATIVE_NS" gitops-test-a.simardeep.xyz A)
txt_record=$(dig +short "@$AUTHORITATIVE_NS" test.simardeep.xyz TXT)
ns_record=$(dig +tcp +norecurse +noall +answer +authority "@$AUTHORITATIVE_NS" delegation-test.simardeep.xyz NS)

assert_contains "$a_record" "203.0.113.10" "A record resolves"
assert_contains "$txt_record" '"dns-as-pr-works"' "TXT record resolves"
assert_contains "$ns_record" "ns-cloud-b1.googledomains.com." "NS delegation resolves"
assert_contains "$ns_record" "ns-cloud-b4.googledomains.com." "NS delegation resolves all nameservers"

echo "e2e dns test passed"
