output "gsa_email" {
  value       = google_service_account.this.email
  description = "Google service account email for ExternalDNS."
}
