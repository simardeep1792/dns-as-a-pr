# Security

## Principles

1. Git is the only source of truth for DNS state.
2. The UI does not write Cloud DNS directly.
3. Runtime automation should use service identities, not personal user tokens.
4. GCP access should use Workload Identity instead of service account keys.

For this POC, cert-manager reuses the existing ExternalDNS Google service account rather than introducing a second DNS-writing identity before the flow is stable.

## Current Runtime Secrets

The UI requires `AZDO_SERVICE_TOKEN` at runtime to open pull requests. That token should be:

1. Issued to a dedicated Azure DevOps service identity.
2. Stored in Kubernetes through a secret management path approved for the cluster.
3. Rotated on a defined schedule.

The runtime should not use personal access tokens tied to an individual user. Use a service identity with only the Azure Repos permissions needed to read, create branches, push request manifests, and open pull requests.

## Public UI Risk

The UI is intentionally public for this POC. That means request validation must stay strict and the backend should be treated as an internet-facing service.

Recommended next controls:

1. Add authentication before general release.
2. Add rate limiting.
3. Add request audit logging.
4. Move runtime secrets into External Secrets or another managed secret backend.
