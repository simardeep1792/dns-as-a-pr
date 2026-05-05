# Infrastructure (OpenTofu)

This directory provisions the DNS registry control plane:

1. GKE Autopilot cluster (`dns-as-a-pr`) used only for ArgoCD + ExternalDNS (+ optional cert-manager).
2. Cloud DNS public managed zone for `simardeep.xyz`.
3. IAM + Workload Identity bindings so controllers authenticate without service account keys.

## Environments

`infra/envs/poc` wires together the modules and uses a GCS backend:

- Bucket: `edip-aurora-fgc-tofu-state`
- Location: `northamerica-northeast1`

## Operator Flow

```bash
cd infra/envs/poc
tofu init
tofu apply
```

After apply, copy Cloud DNS nameservers for Namecheap delegation:

```bash
tofu output -json name_servers
```

## CI Note (Infra Plans)

The `Infrastructure Validation` GitHub Actions workflow runs `tofu plan` on PRs.
It authenticates to GCP using GitHub OIDC (no service account keys) and expects these GitHub repo secrets:

1. `GCP_WORKLOAD_IDENTITY_PROVIDER`
2. `GCP_TERRAFORM_SA_EMAIL`
