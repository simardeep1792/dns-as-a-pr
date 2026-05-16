# Azure DevOps

## Repository Model

The platform is Azure DevOps-first.

1. Organization: `EDIP-PIDE`
2. Project: `dns-as-a-pr`
3. Repository: `dns-as-a-pr`
4. Default branch: `main`

## UI Pull Request Behavior

The UI backend uses the Azure DevOps Git API to:

1. Create a request branch.
2. Add or update a DNS manifest.
3. Open a pull request into `main`.

## Service Identity

Use a dedicated service identity for runtime automation.

Required repository permissions:

1. Read
2. Contribute
3. Create branch
4. Create pull request

Configure the UI with `AZDO_SERVICE_TOKEN` from a dedicated Azure DevOps service identity. The value must be an OAuth bearer token, and the UI backend sends it only as a bearer credential. The UI backend no longer accepts the generic `AZDO_TOKEN` fallback because the runtime credential should be explicit and service-owned.

## Pipelines

This repo includes four Azure pipeline entrypoints:

1. `azure-pipelines-dns.yml`
2. `azure-pipelines-k8s.yml`
3. `azure-pipelines-infra.yml`
4. `azure-pipelines-ui.yml`

The UI pipeline now validates and builds the image without relying on an Azure pipeline service connection reference in YAML. Registry push is controlled by operator-supplied variables.

## UI Image Publish

The UI pipeline publishes the `dns-request-ui:main` image only from `main` branch runs. It uses Azure DevOps OIDC plus Google Workload Identity Federation to impersonate a Google service account; it does not use PATs or static registry passwords.

The Azure DevOps OIDC request uses the `7.1-preview.1` API version required by `System.OidcRequestUri`.

Required pipeline variables:

1. `GCP_WORKLOAD_IDENTITY_PROVIDER`: Full Google Workload Identity provider resource name trusted for Azure DevOps OIDC tokens.
2. `GCP_DEPLOY_SERVICE_ACCOUNT`: Google service account email used to push Artifact Registry images and restart the GKE deployment.

Required Google permissions for that service account:

1. Artifact Registry writer on `northamerica-northeast1-docker.pkg.dev/edip-aurora-fgc/dns-as-a-pr`.
2. GKE access sufficient to run `kubectl rollout restart deploy/dns-request-ui -n dns-ui`.
