package dns

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  name := input.spec.endpoints[i].dnsName
  name == "simardeep.xyz"
  msg := "apex domain simardeep.xyz is not allowed; use a subdomain"
}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  name := input.spec.endpoints[i].dnsName
  name == "simardeep.xyz."
  msg := "apex domain simardeep.xyz is not allowed; use a subdomain"
}

deny[msg] {
  input.kind == "DNSEndpoint"
  some i
  name := input.spec.endpoints[i].dnsName
  not endswith(trim(name, "."), ".simardeep.xyz")
  not name == "simardeep.xyz"
  not name == "simardeep.xyz."
  msg := sprintf("dnsName %q must end with .simardeep.xyz", [name])
}
