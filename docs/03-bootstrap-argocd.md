# Bootstrapping ArgoCD

ArgoCD is installed once manually. After that, ArgoCD manages all Kubernetes resources (including itself and platform components).

## Get Cluster Credentials

```bash
gcloud container clusters get-credentials dns-as-a-pr \
  --zone northamerica-northeast1-a \
  --project edip-aurora-fgc
```

## Install ArgoCD (one-time)

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.6/manifests/install.yaml
```

## Apply the Root App (App of Apps)

```bash
kubectl apply -f k8s/bootstrap/root-app.yaml
```

## Get Initial Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d
echo
```

## Verify Sync

```bash
kubectl -n argocd get applications
kubectl -n external-dns get pods
kubectl -n dns get dnsendpoints.externaldns.k8s.io
```
