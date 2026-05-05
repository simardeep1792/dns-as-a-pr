variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "cluster_name" {
  type        = string
  description = "GKE cluster name."
}

variable "region" {
  type        = string
  description = "GCP region for subnet and regional resources."
}

variable "location" {
  type        = string
  description = "GCP location for the GKE cluster. For Autopilot this must be a region (e.g. northamerica-northeast1)."
}

variable "network_name" {
  type        = string
  description = "Existing VPC network name to reuse."
}

variable "subnet_name" {
  type        = string
  description = "Subnetwork name to create for this cluster."
}

variable "authorized_cidr" {
  type        = string
  description = "CIDR block allowed to reach the GKE control plane public endpoint (master authorized networks)."
}

variable "subnet_primary_cidr" {
  type        = string
  description = "Primary CIDR for the cluster subnetwork."
  default     = "10.200.0.0/24"
}

variable "pods_secondary_cidr" {
  type        = string
  description = "Secondary CIDR for GKE Pod IPs (VPC-native)."
  default     = "10.201.0.0/22"
}

variable "services_secondary_cidr" {
  type        = string
  description = "Secondary CIDR for GKE Service IPs (VPC-native)."
  default     = "10.202.0.0/24"
}

variable "master_ipv4_cidr_block" {
  type        = string
  description = "RFC1918 CIDR for the control plane VPC peering range."
  default     = "172.16.0.0/28"
}
