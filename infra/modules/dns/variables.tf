variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "managed_zone_name" {
  type        = string
  description = "Cloud DNS managed zone name (resource name)."
}

variable "dns_name" {
  type        = string
  description = "DNS name for the zone (e.g. simardeep.xyz)."
}
