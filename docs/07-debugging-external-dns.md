# Debugging ExternalDNS

## Check Controller Health

```bash
kubectl -n external-dns get pods
kubectl -n external-dns logs deploy/external-dns --tail=200
```

## Confirm Workload Identity Annotation

```bash
kubectl -n external-dns get sa external-dns -o yaml | rg iam.gke.io/gcp-service-account
```

Expected: `external-dns@edip-aurora-fgc.iam.gserviceaccount.com`

## Confirm DNSEndpoints Exist

```bash
kubectl -n dns get dnsendpoints.externaldns.k8s.io
kubectl -n dns describe dnsendpoint <name>
```

## Confirm Domain Filter

ExternalDNS is scoped to `simardeep.xyz` via `domainFilters`. If your record is outside that suffix it will be ignored.

## Check Cloud DNS

```bash
gcloud dns managed-zones list --project edip-aurora-fgc
gcloud dns record-sets list --zone simardeep-xyz --project edip-aurora-fgc
```
