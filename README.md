# DNS As A PR

`dns-as-a-pr` is an Azure DevOps-first GitOps platform for managing DNS records through pull requests.

It gives teams a clear request path for DNS changes: submit through the UI or YAML, validate in Azure Pipelines, and let Argo CD plus ExternalDNS reconcile approved changes into Google Cloud DNS.

## About This Project

`dns-as-a-pr` helps teams manage DNS with the same review, traceability, and approval model they already use for code.

Instead of editing DNS records manually in a cloud console, users create a pull request in Azure DevOps. After merge, GitOps controllers apply the approved state into GKE and publish the change to Cloud DNS.

`simardeep.xyz` appears in this repository as an example domain for the POC. Treat it as placeholder data unless the deployment is intentionally using that zone.

This keeps DNS changes:

1. Reviewable
2. Auditable
3. Repeatable
4. Git-backed

ADO-friendly request path:

```text
UI / CLI
  |
  v
Azure DevOps pull request
  |
  v
Azure Pipelines validation
  |
  v
Merge to main
  |
  v
Argo CD sync
  |
  v
ExternalDNS reconcile
  |
  v
Google Cloud DNS
```

## Project Summary

1. Azure Repos is the source of truth.
2. Azure Pipelines validates DNS, Kubernetes, infrastructure, and UI changes.
3. Argo CD continuously syncs platform state into GKE.
4. ExternalDNS reconciles `DNSEndpoint` resources into Google Cloud DNS.
5. cert-manager issues HTTPS certificates for the public UI hostname.

ADO-friendly component view:

```text
+------------------+
| Request layer    |
| UI / CLI         |
+------------------+

+------------------+
| Source of truth  |
| Azure Repos      |
+------------------+

+------------------+
| Validation       |
| Azure Pipelines  |
+------------------+

+------------------+
| Runtime on GKE   |
| Argo CD          |
| ExternalDNS      |
| cert-manager     |
+------------------+

+------------------+
| DNS provider     |
| Google Cloud DNS |
+------------------+
```

## What This Repo Owns

1. DNS record manifests in `dns-records/`.
2. GKE platform GitOps manifests in `k8s/`.
3. OpenTofu infrastructure in `infra/`.
4. The DNS request UI in `ui/`.
5. Validation and e2e scripts in `scripts/`.

## Request Flow

1. A requester submits a DNS record request from the UI or CLI.
2. The request is normalized into a `DNSEndpoint` manifest.
3. The UI creates a branch and pull request in Azure DevOps.
4. Azure Pipelines validate DNS, Kubernetes, infrastructure, and UI changes.
5. After merge, Argo CD syncs the repository into GKE.
6. ExternalDNS reconciles the record into the public Cloud DNS zone.

## Repository Layout

```text
.
|-- dns-records/   # DNSEndpoint manifests
|-- docs/          # Architecture, operations, security, and Azure DevOps docs
|-- infra/         # OpenTofu modules and environments
|-- k8s/           # Argo CD bootstrap and application manifests
|-- schemas/       # Validation schemas used by kubeconform
|-- scripts/       # Validation, generation, and e2e helpers
`-- ui/            # Public request UI and API
```

## Quick Validation

Run from the repository root:

```bash
scripts/validate-dns.sh
scripts/validate-k8s.sh
scripts/validate-infra.sh
```

## UI

The UI is a thin request layer. It does not write Cloud DNS directly and it does not call GCP APIs.

It creates Azure DevOps pull requests against:

1. Organization: `EDIP-PIDE`
2. Project: `dns-as-a-pr`
3. Repository: `dns-as-a-pr`
4. Target branch: `main`

Run locally:

```bash
cd ui
npm ci
npm start
```

Open `http://localhost:8080`.

## Certificates

The example UI hostname `dns-ui.simardeep.xyz` is wired for cert-manager with Let’s Encrypt DNS-01 on GKE. Replace it with the real hostname used by your environment if `simardeep.xyz` is not your active zone.

1. A cert-manager Argo CD application.
2. Let’s Encrypt `ClusterIssuer` resources.
3. A `Certificate` for the UI ingress.

See `docs/certificates.md` for the operator prerequisites and GitOps structure.

## Operator Notes

This README intentionally does not document personal user tokens or raw secret values.

Operators should provision:

1. An Azure DevOps service identity with least-privilege repository permissions.
2. Kubernetes secrets or an external secret backend for runtime tokens.
3. Container registry credentials for the UI image push path.
4. A GKE Workload Identity binding that lets the `cert-manager/cert-manager` Kubernetes service account impersonate the Cloud DNS-capable Google service account.

See:

1. `docs/azure-devops.md`
2. `docs/security.md`
3. `docs/operations.md`

## Docs

1. `docs/architecture.md`
2. `docs/azure-devops.md`
3. `docs/certificates.md`
4. `docs/operations.md`
5. `docs/security.md`
