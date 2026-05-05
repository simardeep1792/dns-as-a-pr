variable "project_id" {
  type        = string
  description = "GCP project ID."
  default     = "edip-aurora-fgc"
}

variable "region" {
  type        = string
  description = "GCP region."
  default     = "northamerica-northeast1"
}

variable "zone" {
  type        = string
  description = "GCP zone."
  default     = "northamerica-northeast1-a"
}

variable "authorized_cidr" {
  type        = string
  description = "CIDR allowed to access the GKE control plane public endpoint (e.g. 203.0.113.4/32)."
}

variable "dns_name" {
  type        = string
  description = "Apex DNS name for the public zone."
  default     = "simardeep.xyz"
}

variable "network_name" {
  type        = string
  description = "Existing VPC network name to reuse."
  default     = "gke-vpc-network"
}

variable "cluster_name" {
  type        = string
  description = "GKE cluster name."
  default     = "dns-as-a-pr"
}

variable "subnet_name" {
  type        = string
  description = "Subnetwork name to create."
  default     = "dns-as-a-pr-subnet"
}

variable "subnet_primary_cidr" {
  type        = string
  description = "Primary CIDR for the cluster subnetwork."
  default     = "10.200.0.0/24"
}

variable "pods_secondary_cidr" {
  type        = string
  description = "Secondary CIDR for Pod IPs."
  default     = "10.201.0.0/22"
}

variable "services_secondary_cidr" {
  type        = string
  description = "Secondary CIDR for Service IPs."
  default     = "10.202.0.0/24"
}

variable "managed_zone_name" {
  type        = string
  description = "Cloud DNS managed zone name."
  default     = "simardeep-xyz"
}
