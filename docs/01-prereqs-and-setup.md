# Prerequisites and Initial Setup

## Required Access

You need permissions in GCP project `edip-aurora-fgc` to:

1. Create GKE clusters and subnetworks
2. Create Cloud DNS managed zones
3. Create service accounts and IAM bindings

## Local Tools

Install:

1. `gcloud` (with `gke-gcloud-auth-plugin`)
2. `kubectl`
3. OpenTofu (`tofu`)

Optional (for local CI parity):

1. `conftest`
2. `kubeconform`
3. `yamllint`

## Authenticate to GCP

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project edip-aurora-fgc
```

## Create the OpenTofu State Bucket

This must exist before `tofu init` can use the backend.

```bash
gcloud storage buckets create gs://edip-aurora-fgc-tofu-state \
  --project=edip-aurora-fgc \
  --location=northamerica-northeast1 \
  --uniform-bucket-level-access
```

Verify:

```bash
gcloud storage buckets describe gs://edip-aurora-fgc-tofu-state
```
