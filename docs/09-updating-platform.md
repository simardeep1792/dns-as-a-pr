# Rotating / Updating the Platform

All updates are Git changes merged via PR.

## Update ExternalDNS

1. Update `k8s/platform/external-dns-app.yaml` chart `targetRevision`.
2. Merge PR.
3. Confirm ArgoCD sync and controller logs are healthy.

## Update ArgoCD

ArgoCD was installed from a pinned upstream manifest.

1. Update the version in `docs/03-bootstrap-argocd.md` and (if you manage ArgoCD via Git later) the corresponding manifest.
2. Apply via ArgoCD (preferred) or re-bootstrap if you intentionally keep install-only as manual.

## Breaking Changes in OpenTofu Modules

1. Make module changes behind new variables (when possible).
2. Run `tofu plan` in `infra/envs/poc`.
3. Apply manually with operator approval.
