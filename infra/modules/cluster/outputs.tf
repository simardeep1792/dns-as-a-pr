output "cluster_name" {
  value       = google_container_cluster.this.name
  description = "GKE cluster name."
}

output "location" {
  value       = google_container_cluster.this.location
  description = "GKE cluster location (zone)."
}

output "workload_identity_pool" {
  value       = "${var.project_id}.svc.id.goog"
  description = "Workload Identity pool (workload_pool)."
}

output "subnet_self_link" {
  value       = google_compute_subnetwork.this.self_link
  description = "Self link of the created subnet."
}
