variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "managed_zone_name" {
  type        = string
  description = "Cloud DNS managed zone name (resource name)."
}

variable "gsa_account_id" {
  type        = string
  description = "Service account account_id (no domain) for ExternalDNS."
  default     = "external-dns"
}

variable "ksa_namespace" {
  type        = string
  description = "Kubernetes namespace where ExternalDNS runs."
  default     = "external-dns"
}

variable "ksa_name" {
  type        = string
  description = "Kubernetes service account name for ExternalDNS."
  default     = "external-dns"
}
