resource "google_service_account" "this" {
  project      = var.project_id
  account_id   = var.gsa_account_id
  display_name = "ExternalDNS (Workload Identity)"
}

# Workload Identity binding: allow the KSA to impersonate the GSA.
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.this.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.ksa_namespace}/${var.ksa_name}]"
}

# Least-privilege intent:
# - ExternalDNS needs to read the managed zone and submit record changes.
# - We bind dns.admin with an IAM Condition limiting access to the specific managed zone.
resource "google_project_iam_member" "dns_admin_zone_scoped" {
  project = var.project_id
  role    = "roles/dns.admin"
  member  = "serviceAccount:${google_service_account.this.email}"

  condition {
    title       = var.condition_title
    description = "Limit Cloud DNS permissions to managed zone ${var.managed_zone_name}."
    expression  = "resource.name.startsWith('projects/${var.project_id}/managedZones/${var.managed_zone_name}')"
  }
}
