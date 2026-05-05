output "name_servers" {
  value       = module.dns.name_servers
  description = "Configure these nameservers in Namecheap for simardeep.xyz."
}

output "external_dns_gsa_email" {
  value       = module.iam_external_dns.gsa_email
  description = "GSA email mapped to ExternalDNS KSA via Workload Identity."
}

output "workload_identity_pool" {
  value       = module.cluster.workload_identity_pool
  description = "Workload Identity pool."
}
