# Provisioning the Infrastructure

This provisions:

1. GKE Autopilot cluster `dns-as-a-pr` (zonal `northamerica-northeast1-a`)
2. Subnet `dns-as-a-pr-subnet` in existing VPC `gke-vpc-network`
3. Cloud DNS public zone `simardeep.xyz`
4. IAM + Workload Identity bindings for ExternalDNS and cert-manager

## Apply

```bash
cd infra/envs/poc
tofu init
tofu apply \
  -var "authorized_cidr=<YOUR_PUBLIC_IP>/32"
```

## Verify Outputs

Nameservers for Namecheap:

```bash
tofu output -json name_servers
```

Service accounts (used by Kubernetes ServiceAccounts via Workload Identity):

```bash
tofu output external_dns_gsa_email
tofu output cert_manager_gsa_email
```

## If Apply Fails

1. Re-run with logs: `TF_LOG=INFO tofu apply ...`
2. If a resource was partially created, run `tofu state list` and compare with GCP.
3. Fix the root cause and re-run `tofu apply` (OpenTofu is declarative).
