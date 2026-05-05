resource "google_dns_managed_zone" "this" {
  project  = var.project_id
  name     = var.managed_zone_name
  dns_name = "${trim(var.dns_name, ".")}."

  visibility = "public"

  description = "Authoritative public zone for ${trim(var.dns_name, ".")}. Managed declaratively from Git."
}
