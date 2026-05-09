# simardeep-platform (dns-as-a-pr)

This repository is a GitOps DNS registry for `simardeep.xyz`: you register subdomains by opening a GitHub pull request.
ArgoCD syncs the declared DNS records into a dedicated GKE control-plane cluster, and ExternalDNS reconciles them into Google Cloud DNS.

```
  Developer / Team
        |
        | 1) PR adds/updates dns-records/*.yaml (DNSEndpoint)
        v
     GitHub (main)
        |
        | 2) ArgoCD sync
        v
  GKE Autopilot (dns-as-a-pr)
    - ArgoCD
    - ExternalDNS (source=crd)
        |
        | 3) ExternalDNS calls Cloud DNS API (Workload Identity)
        v
   Cloud DNS managed zone: simardeep.xyz
        |
        v
    Public DNS resolvers / internet
```

**Components**

| Component | What it is | Why it is used here | Docs |
|---|---|---|---|
| Argo CD | CNCF GitOps controller | Applies Kubernetes manifests from Git and keeps them reconciled | https://argo-cd.readthedocs.io/ |
| ExternalDNS | Kubernetes controller | Reconciles `DNSEndpoint` CRs into Cloud DNS records | https://github.com/kubernetes-sigs/external-dns |
| OpenTofu | IaC tool (Terraform-compatible) | Provisions GKE, Cloud DNS, IAM, Workload Identity bindings | https://opentofu.org/ |
| kubeconform | Kubernetes manifest validator | Schema validation for CRDs (ExternalDNS) | https://github.com/yannh/kubeconform |

## Quickstart (Operator)

### Prereqs

1. GCP project: `edip-aurora-fgc`
2. Domain registered at Namecheap: `simardeep.xyz`
3. Tools installed locally:
   - `gcloud`
   - `kubectl`
   - `tofu` (OpenTofu)

### 1) Create the OpenTofu state bucket

Make sure the bucket exists before running any OpenTofu commands:

```bash
gcloud storage buckets create gs://edip-aurora-fgc-tofu-state \
  --project=edip-aurora-fgc \
  --location=northamerica-northeast1 \
  --uniform-bucket-level-access
```

### 2) Provision infrastructure (GKE + Cloud DNS + IAM)

```bash
cd infra/envs/poc
tofu init
tofu apply -var "authorized_cidr=<YOUR_PUBLIC_IPV4>/32"
```

After apply, copy the Cloud DNS nameservers:

```bash
tofu output -json name_servers
```

### 3) Configure Namecheap to delegate DNS to Cloud DNS

Update the `simardeep.xyz` nameserver settings in Namecheap to the exact list output by OpenTofu.

Runbook: `docs/04-configure-namecheap.md`

### 4) Bootstrap ArgoCD (one-time)

Once the cluster exists and your kubeconfig points to it:

```bash
gcloud container clusters get-credentials dns-as-a-pr \
  --region northamerica-northeast1 \
  --project edip-aurora-fgc

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.6/manifests/install.yaml
kubectl apply -f k8s/bootstrap/root-app.yaml
```

Runbook: `docs/03-bootstrap-argocd.md`

## Adding a Subdomain

DNS records are declared as `DNSEndpoint` YAML files under `dns-records/`.

### Pattern 1: Point to an IPv4 address (A record)

Use when you have a stable public IPv4 (VPS, VM, bare metal).

### Pattern 2: Point to a hostname (CNAME)

Use when your provider gives you a hostname target (Vercel, Netlify, Render, Railway).

### Pattern 3: Delegate a whole zone (NS delegation)

Use when you run your own authoritative DNS for `something.simardeep.xyz` (your own Cloud DNS zone / cluster). This creates `NS` records that hand off authority for everything under that subdomain.

Step-by-step guide: `dns-records/README.md`

After merge, verify:

```bash
dig +short <subdomain>.simardeep.xyz A
dig +short <subdomain>.simardeep.xyz CNAME
dig +short <subdomain>.simardeep.xyz NS
```

## Security Model

1. Workload Identity only: no service account keys are created; no GCP credentials are stored in Git or Kubernetes Secrets.
2. Least-privilege IAM: ExternalDNS uses Workload Identity with DNS permissions scoped to the `simardeep.xyz` managed zone.
3. Git approval gate: DNS changes require PR review enforced by `CODEOWNERS`.
4. Blast radius: if ExternalDNS credentials were compromised, an attacker could modify records in `simardeep.xyz` but cannot manage other GCP resources.
