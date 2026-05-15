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

Configure the UI with `AZDO_SERVICE_TOKEN` from a dedicated Azure DevOps service identity. Do not use user-scoped personal tokens for shared automation. The UI backend no longer accepts the generic `AZDO_TOKEN` fallback because the runtime credential should be explicit and service-owned.

## Pipelines

This repo includes four Azure pipeline entrypoints:

1. `azure-pipelines-dns.yml`
2. `azure-pipelines-k8s.yml`
3. `azure-pipelines-infra.yml`
4. `azure-pipelines-ui.yml`

The UI pipeline now validates and builds the image without relying on an Azure pipeline service connection reference in YAML. Registry push is controlled by operator-supplied variables.
