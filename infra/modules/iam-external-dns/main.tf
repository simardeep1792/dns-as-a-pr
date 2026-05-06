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

resource "google_dns_managed_zone_iam_member" "dns_admin_zone" {
  project      = var.project_id
  managed_zone = var.managed_zone_name
  role         = "roles/dns.admin"
  member       = "serviceAccount:${google_service_account.this.email}"
}

# Required: managedZones.list is a project-scoped API call and cannot be restricted to a single zone. This is the minimum permission for ExternalDNS zone discovery — not a workaround.
resource "google_project_iam_member" "dns_reader" {
  project = var.project_id
  role    = "roles/dns.reader"
  member  = "serviceAccount:${google_service_account.this.email}"
}
