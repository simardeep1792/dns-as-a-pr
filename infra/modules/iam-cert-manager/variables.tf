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
  description = "Service account account_id (no domain) for cert-manager."
  default     = "cert-manager"
}

variable "ksa_namespace" {
  type        = string
  description = "Kubernetes namespace where cert-manager runs."
  default     = "cert-manager"
}

variable "ksa_name" {
  type        = string
  description = "Kubernetes service account name for cert-manager."
  default     = "cert-manager"
}

variable "condition_title" {
  type        = string
  description = "Title for the IAM Condition."
  default     = "cert-manager-zone-scoped"
}
