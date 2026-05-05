package dns

deny[msg] {
  input.kind == "DNSEndpoint"
  ns := object.get(input.metadata, "namespace", "")
  ns != "dns"
  msg := sprintf("DNSEndpoint namespace must be 'dns', got '%v'", [ns])
}
