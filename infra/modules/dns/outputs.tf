output "managed_zone_name" {
  value       = google_dns_managed_zone.this.name
  description = "Managed zone name."
}

output "managed_zone_id" {
  value       = google_dns_managed_zone.this.id
  description = "Managed zone resource ID."
}

output "name_servers" {
  value       = google_dns_managed_zone.this.name_servers
  description = "Nameservers to configure at the registrar (Namecheap) to delegate authority to Cloud DNS."
}
