# dns-as-a-pr

`dns-as-a-pr` is a small GitOps DNS registry for `simardeep.xyz`.

The contract is simple: a DNS change is a pull request. After the request is merged, ArgoCD applies the `DNSEndpoint` manifest to the GKE control-plane cluster and ExternalDNS reconciles it into Google Cloud DNS. No service account keys, no manual DNS console work after merge.

```text
Requester
  -> Pull request in Azure Repos
  -> Merge to main
  -> ArgoCD sync on GKE
  -> DNSEndpoint reconcile by ExternalDNS
  -> Google Cloud DNS
```

## Architecture

This platform keeps a narrow responsibility boundary: request and review DNS in Git, then let GitOps and controllers reconcile state.

```text
Request surface
  UI / CLI
      |
      v
Request service
  - input validation
  - DNSEndpoint generation
  - Azure Repos adapter
      |
      v
Azure DevOps
  - Azure Repos (source of truth)
  - Azure Pipelines (validation/build)
      |
      v
GKE control plane
  - ArgoCD
  - DNSEndpoint objects
  - ExternalDNS
      |
      v
Google Cloud DNS
```

### Request Lifecycle

```text
User submits request in UI
  -> API validates metadata and record targets
  -> API writes DNSEndpoint YAML in Azure Repos branch
  -> API opens Azure DevOps pull request
  -> Azure Pipelines validates the change
  -> PR merge to main
  -> ArgoCD syncs from Azure Repos
  -> ExternalDNS updates Google Cloud DNS
```

## What This Runs

| Layer | Choice | Purpose |
|---|---|---|
| Infrastructure | OpenTofu | Creates GKE, Cloud DNS, IAM, and Workload Identity bindings. |
| GitOps | ArgoCD | Continuously applies this repo to the cluster. |
| DNS controller | ExternalDNS | Reads `DNSEndpoint` objects and writes Cloud DNS records. |
| Validation | yamllint + kubeconform | Keeps PRs structurally correct without a policy engine. |

The cluster is intentionally a control plane only. It does not host application traffic.

Azure DevOps is the target host. The reusable scripts in `scripts/` are the validation contract; CI pipelines are wrappers around those scripts so the same checks stay portable.

## Repository Layout

```text
.
|-- dns-records/          # User-facing DNS records; each .yaml is a DNSEndpoint
|-- infra/                # OpenTofu modules and poc environment
|-- k8s/                  # ArgoCD bootstrap and ordered platform manifests
|-- schemas/              # Local JSON schemas for CI validation
|-- scripts/              # Portable validation, generation, and e2e scripts
|-- ui/                   # DNS request web UI and API
`-- README.md             # Product, operator, and contributor guide
```

## DNS Record Contract

All records live in `dns-records/` and must use this shape:

```yaml
apiVersion: externaldns.k8s.io/v1alpha1
kind: DNSEndpoint
metadata:
  name: blog-simardeep-xyz
  namespace: dns
  annotations:
    simardeep.xyz/source-repository: "https://dev.azure.com/<organization>/<project>/_git/<repo>"
    simardeep.xyz/zone-scope: "simardeep-xyz"
  labels:
    simardeep.xyz/controlled-by: "dns-as-a-pr"
    simardeep.xyz/project-name: "<project-name>"
    simardeep.xyz/project-id: "<project-id>"
    simardeep.xyz/owner: "your-name-or-team"
spec:
  endpoints:
    - dnsName: blog.simardeep.xyz
      recordType: A
      recordTTL: 300
      targets:
        - 203.0.113.10
```

Supported record types are `A`, `AAAA`, `CNAME`, `TXT`, and `NS`.

Required metadata contract:

1. `metadata.labels` must include `simardeep.xyz/controlled-by`, `simardeep.xyz/project-name`, `simardeep.xyz/project-id`, and `simardeep.xyz/owner`.
2. `metadata.annotations` must include `simardeep.xyz/source-repository` and `simardeep.xyz/zone-scope`.
3. `simardeep.xyz/zone-scope` must be `simardeep-xyz`.

This keeps ownership and traceability close to each record while staying compatible with ExternalDNS. Unlike KCC `DNSRecordSet`, this workflow does not use per-record `managedZoneRef`; zone targeting is controlled by ExternalDNS filters and the record `dnsName` domain.

Use `NS` when you want to delegate a whole subdomain to another authoritative zone:

```yaml
apiVersion: externaldns.k8s.io/v1alpha1
kind: DNSEndpoint
metadata:
  name: project-simardeep-xyz
  namespace: dns
  labels:
    simardeep.xyz/owner: "your-name-or-team"
spec:
  endpoints:
    - dnsName: project.simardeep.xyz
      recordType: NS
      recordTTL: 300
      targets:
        - ns-cloud-a1.googledomains.com
        - ns-cloud-a2.googledomains.com
        - ns-cloud-a3.googledomains.com
        - ns-cloud-a4.googledomains.com
```

## Add Or Change DNS

1. Copy `dns-records/_template.yaml.txt`.
2. Save it as `dns-records/<subdomain>.simardeep.xyz.yaml`.
3. Set `metadata.name`, `metadata.labels.simardeep.xyz/owner`, `dnsName`, `recordType`, `recordTTL`, and `targets`.
4. Open a pull request.
5. Wait for Azure Pipelines validation to pass.
6. Merge the PR.
7. ArgoCD and ExternalDNS reconcile the record automatically.

Verify from your workstation:

```bash
dig +short <subdomain>.simardeep.xyz A
dig +short <subdomain>.simardeep.xyz TXT
dig +short <subdomain>.simardeep.xyz NS
```

You can also generate the YAML from the command line. This is the same flow a future UI should call behind the scenes:

```bash
scripts/new-dns-record.sh \
  --subdomain blog \
  --type A \
  --target 203.0.113.10 \
  --owner platform
```

## Bootstrap The Platform

Prerequisites:

1. GCP project: `edip-aurora-fgc`
2. Domain: `simardeep.xyz`
3. Local tools: `gcloud`, `kubectl`, `tofu`

Create the OpenTofu state bucket once:

```bash
gcloud storage buckets create gs://edip-aurora-fgc-tofu-state \
  --project=edip-aurora-fgc \
  --location=northamerica-northeast1 \
  --uniform-bucket-level-access
```

Provision GKE, Cloud DNS, and IAM:

```bash
cd infra/envs/poc
tofu init
tofu apply -var "authorized_cidr=<YOUR_PUBLIC_IPV4>/32"
tofu output -json name_servers
```

Set the `simardeep.xyz` nameservers in Namecheap to the Cloud DNS nameservers from `tofu output`.

Bootstrap ArgoCD once:

```bash
gcloud container clusters get-credentials dns-as-a-pr \
  --region northamerica-northeast1 \
  --project edip-aurora-fgc

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.6/manifests/install.yaml
kubectl apply -f k8s/bootstrap/root-app.yaml
```

After that, ArgoCD owns the platform from Git.

## Validate Locally

```bash
scripts/validate-dns.sh
scripts/validate-k8s.sh
scripts/validate-infra.sh
```

## Azure Pipelines

Use these pipeline definitions in Azure DevOps:

1. `azure-pipelines-dns.yml`
2. `azure-pipelines-k8s.yml`
3. `azure-pipelines-infra.yml`
4. `azure-pipelines-ui.yml`

`azure-pipelines-ui.yml` expects a Docker service connection named by `GAR_DOCKER_SERVICE_CONNECTION` that authenticates to Google Artifact Registry using Workload Identity Federation.

## End-To-End Test

Run the live DNS test from the repo root:

```bash
./scripts/e2e-dns.sh
```

The test verifies:

1. ArgoCD apps are synced and healthy.
2. `DNSEndpoint` objects exist in the `dns` namespace.
3. ExternalDNS is running with the expected CRD source, domain filter, public-zone filter, and record type flags.
4. Cloud DNS has the expected A, TXT, NS, and ownership TXT records.
5. Authoritative Cloud DNS nameservers resolve the records.

## Operations

Check ArgoCD:

```bash
kubectl -n argocd get applications
```

Check ExternalDNS:

```bash
kubectl -n external-dns get pods
kubectl -n external-dns logs deploy/external-dns --tail=100
```

Check records in Cloud DNS:

```bash
gcloud dns record-sets list --zone simardeep-xyz --project edip-aurora-fgc
```

ExternalDNS-managed records have ownership TXT records prefixed with `edns-`.

## Security Model

1. GCP auth uses Workload Identity. There are no service account keys.
2. ExternalDNS writes only through the dedicated Google service account.
3. DNS changes are reviewed through Azure DevOps pull requests and branch policies.
4. ExternalDNS is scoped to `simardeep.xyz` and public Cloud DNS zones.

## UI Service

The UI service is part of the platform and stays thin: capture a DNS request, generate a `DNSEndpoint`, create a branch, and open a pull request.

```text
UI form -> generate YAML -> create branch -> open pull request -> CI -> merge -> ArgoCD -> ExternalDNS
```

The UI never writes Cloud DNS directly and does not call GCP APIs. Git remains the source of truth.

Provider integration is intentionally small:

```text
GitProvider.createBranch()
GitProvider.upsertFile()
GitProvider.openPullRequest()
```

The provider in this repository targets Azure DevOps.

### Run UI Locally

```bash
cd ui
npm install
npm start
```

Open `http://localhost:8080`.

Default mode is `dry-run` so it validates and generates YAML without creating a real pull request.

Enable real Azure DevOps pull request creation by setting:

```bash
export GIT_PROVIDER_MODE=azure-devops
export AZDO_TOKEN=<azure-devops-pat>
export AZDO_ORGANIZATION=EDIP-PIDE
export AZDO_PROJECT=dns-as-a-pr
export AZDO_REPOSITORY=dns-as-a-pr
export GIT_BASE_BRANCH=main
```

### Deploy UI To GKE

ArgoCD deploys the UI from `k8s/apps/dns-request-ui` through `k8s/platform/25-dns-request-ui-app.yaml`.

ArgoCD must authenticate to Azure Repos with a read-only PAT:

```bash
kubectl -n argocd create secret generic repo-azure-dns-as-pr \
  --from-literal=type=git \
  --from-literal=url='https://dev.azure.com/EDIP-PIDE/dns-as-a-pr/_git/dns-as-a-pr' \
  --from-literal=username='<azure-devops-username>' \
  --from-literal=password='<azure-devops-read-pat>' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n argocd label secret repo-azure-dns-as-pr argocd.argoproj.io/secret-type=repository --overwrite
```

Required runtime secret:

```bash
kubectl -n dns-ui create secret generic dns-request-ui-secrets \
  --from-literal=azdo-token='<azure-devops-pat>'
```

Image build and push are automated by `azure-pipelines-ui.yml`.
