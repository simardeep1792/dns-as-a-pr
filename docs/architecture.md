# Architecture

## Purpose

`dns-as-a-pr` keeps DNS changes inside the same review and audit workflow as code changes.

## Architecture

This platform keeps a narrow responsibility boundary: request and review DNS in Git, then let GitOps and controllers reconcile state.

`simardeep.xyz` and `dns-ui.simardeep.xyz` are example values used in this POC repository. Replace them with the real zone and hostname used by your environment.

```text
+-------------------+
| Request Surface   |
| UI / CLI          |
+-------------------+
          |
          v
+-------------------+
| Request Service   |
| Request API       |
| YAML generator    |
| ADO adapter       |
+-------------------+
          |
          v
+-------------------+
| Git Platform      |
| Azure Repos       |
| Azure Pipelines   |
+-------------------+
          |
          v
+-------------------+
| GKE Control Plane |
| Argo CD           |
| DNSEndpoint CRDs  |
| ExternalDNS       |
| cert-manager      |
+-------------------+
          |
          v
+-------------------+
| Authoritative DNS |
| Google Cloud DNS  |
+-------------------+
```

## Request Lifecycle

```text
User
  |
  v
Submit request in UI or CLI
  |
  v
Request API validates input
  |
  v
DNSEndpoint YAML is generated
  |
  v
Azure DevOps branch is created
  |
  v
Azure DevOps pull request is opened
  |
  v
Azure Pipelines validate the change
  |
  v
Approved pull request is merged to main
  |
  v
Argo CD syncs the updated repository state
  |
  v
ExternalDNS reconciles the DNSEndpoint
  |
  v
Google Cloud DNS is updated
```

## Runtime Components

1. Azure Repos is the source of truth.
2. Azure Pipelines is the validation and image build layer.
3. Argo CD continuously applies platform state into GKE.
4. ExternalDNS watches `DNSEndpoint` resources in the `dns` namespace.
5. cert-manager issues HTTPS certificates for the public UI hostname.

## Boundaries

1. The UI creates pull requests only.
2. The UI does not write DNS records directly.
3. Cloud DNS changes happen only after Git merge and controller reconciliation.
