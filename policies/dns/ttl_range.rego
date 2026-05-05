package dns

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  ep := input.spec.endpoints[i]
  ttl := object.get(ep, "ttl", object.get(ep, "recordTTL", null))
  not is_number(ttl)
  msg := sprintf("ttl must be an integer between 60 and 86400 (got %v)", [ttl])
}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  ep := input.spec.endpoints[i]
  ttl := object.get(ep, "ttl", object.get(ep, "recordTTL", null))
  is_number(ttl)
  (ttl < 60 or ttl > 86400)
  msg := sprintf("ttl must be between 60 and 86400 (got %v)", [ttl])
}
