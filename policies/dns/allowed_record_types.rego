package dns

allowed_types := {"A", "AAAA", "CNAME", "NS", "TXT", "MX"}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  t := input.spec.endpoints[i].recordType
  not allowed_types[t]
  msg := sprintf("recordType %q is not allowed (allowed: A, AAAA, CNAME, NS, TXT, MX)", [t])
}
