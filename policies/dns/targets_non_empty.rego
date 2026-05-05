package dns

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  ep := input.spec.endpoints[i]
  not ep.targets
  msg := sprintf("targets must be non-empty for dnsName %q", [ep.dnsName])
}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  ep := input.spec.endpoints[i]
  ep.targets
  count(ep.targets) == 0
  msg := sprintf("targets must be non-empty for dnsName %q", [ep.dnsName])
}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  ep := input.spec.endpoints[i]
  ep.recordType == "NS"
  count(ep.targets) < 2
  msg := sprintf("NS delegation for dnsName %q must provide at least 2 nameservers", [ep.dnsName])
}
