data "google_compute_network" "this" {
  name    = var.network_name
  project = var.project_id
}

resource "google_compute_subnetwork" "this" {
  name          = var.subnet_name
  project       = var.project_id
  region        = var.region
  network       = data.google_compute_network.this.id
  ip_cidr_range = var.subnet_primary_cidr

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_secondary_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_secondary_cidr
  }
}

resource "google_container_cluster" "this" {
  name     = var.cluster_name
  project  = var.project_id
  location = var.location

  enable_autopilot = true

  network    = data.google_compute_network.this.id
  subnetwork = google_compute_subnetwork.this.id

  # Regular release channel for a stable control-plane cluster.
  release_channel {
    channel = "REGULAR"
  }

  # Autopilot + VPC-native.
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes = true
    # Private endpoint is incompatible with authorizing a public operator CIDR.
    # We keep private nodes and a restricted public control plane endpoint.
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.master_ipv4_cidr_block
  }

  master_authorized_networks_config {
    # We use the public control plane endpoint + authorized networks for operator access.
    # If private endpoint enforcement is enabled, GKE requires the CIDRs to be reserved RFC1918 ranges.
    private_endpoint_enforcement_enabled = false

    cidr_blocks {
      cidr_block   = var.authorized_cidr
      display_name = "operator"
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  # This cluster is a control plane only; no application traffic is served.
  deletion_protection = false
}
