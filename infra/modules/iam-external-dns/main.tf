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

resource "google_dns_managed_zone_iam_member" "dns_admin" {
  project      = var.project_id
  managed_zone = var.managed_zone_name
  role         = "roles/dns.admin"
  member       = "serviceAccount:${google_service_account.this.email}"
}

# Required because the Cloud DNS managedZones.list API call is project-scoped and cannot be restricted to a single zone.
# This is not a workaround; ExternalDNS must list zones to discover which managed zone matches its domain filters.
resource "google_project_iam_member" "dns_reader" {
  project = var.project_id
  role    = "roles/dns.reader"
  member  = "serviceAccount:${google_service_account.this.email}"
}
