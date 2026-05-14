# Architecture

## Purpose

`dns-as-a-pr` keeps DNS changes inside the same review and audit workflow as code changes.

## End-To-End Flow

```text
Requester
  -> UI or CLI
  -> Azure DevOps branch
  -> Azure DevOps pull request
  -> Azure Pipelines validation
  -> Merge to main
  -> Argo CD sync
  -> DNSEndpoint applied in GKE
  -> ExternalDNS updates Cloud DNS
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
