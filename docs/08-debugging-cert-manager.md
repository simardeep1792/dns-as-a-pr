# Debugging cert-manager

cert-manager is optional for this platform. DNS record provisioning does not depend on it.

## Check Health

```bash
kubectl -n cert-manager get pods
kubectl -n cert-manager logs deploy/cert-manager --tail=200
```

## Workload Identity

```bash
kubectl -n cert-manager get sa cert-manager -o yaml | rg iam.gke.io/gcp-service-account
```

Expected: `cert-manager@edip-aurora-fgc.iam.gserviceaccount.com`

## Trace an ACME Challenge

```bash
kubectl get clusterissuers
kubectl describe clusterissuer letsencrypt-staging-dns01
kubectl get challenges,orders --all-namespaces
```

If DNS-01 fails, check Cloud DNS permissions for the cert-manager GSA and confirm the zone exists.
