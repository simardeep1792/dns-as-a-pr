module "cluster" {
  source = "../../modules/cluster"

  project_id      = var.project_id
  cluster_name    = var.cluster_name
  region          = var.region
  location        = var.region
  network_name    = var.network_name
  subnet_name     = var.subnet_name
  authorized_cidr = var.authorized_cidr

  subnet_primary_cidr     = var.subnet_primary_cidr
  pods_secondary_cidr     = var.pods_secondary_cidr
  services_secondary_cidr = var.services_secondary_cidr
}

module "dns" {
  source = "../../modules/dns"

  project_id        = var.project_id
  managed_zone_name = var.managed_zone_name
  dns_name          = var.dns_name
}

module "iam_external_dns" {
  source = "../../modules/iam-external-dns"

  project_id        = var.project_id
  managed_zone_name = module.dns.managed_zone_name
}

module "iam_cert_manager" {
  source = "../../modules/iam-cert-manager"

  project_id        = var.project_id
  managed_zone_name = module.dns.managed_zone_name
}
