# Operations

## Core Checks

Argo CD:

```bash
kubectl -n argocd get applications
```

ExternalDNS:

```bash
kubectl -n external-dns get pods
kubectl -n external-dns logs deploy/external-dns --tail=100
```

cert-manager:

```bash
kubectl -n cert-manager get pods
kubectl get clusterissuers
kubectl -n dns-ui get certificate
```

UI ingress:

```bash
kubectl -n dns-ui get ingress,service,deployment
curl -I https://dns-ui.simardeep.xyz/
```

UI image rollout:

```bash
kubectl -n dns-ui get deploy dns-request-ui -o wide
kubectl -n dns-ui rollout status deploy/dns-request-ui
gcloud artifacts docker images describe northamerica-northeast1-docker.pkg.dev/edip-aurora-fgc/dns-as-a-pr/dns-request-ui:main --project edip-aurora-fgc
```

Cloud DNS:

```bash
gcloud dns record-sets list --zone simardeep-xyz --project edip-aurora-fgc
```

## Local Validation

```bash
scripts/validate-dns.sh
scripts/validate-k8s.sh
scripts/validate-infra.sh
```
