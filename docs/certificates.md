# Certificates

## Goal

Expose `dns-ui.simardeep.xyz` over HTTPS using cert-manager and Let’s Encrypt DNS-01 on GKE.

## GitOps Structure

1. `k8s/platform/15-cert-manager-app.yaml` installs cert-manager from the Jetstack chart.
2. `k8s/platform/16-cert-manager-issuers-app.yaml` applies the issuer resources.
3. `k8s/apps/cert-manager-issuers/clusterissuers.yaml` defines staging and production `ClusterIssuer` resources.
4. `k8s/apps/dns-request-ui/certificate.yaml` requests the UI certificate.
5. `k8s/apps/dns-request-ui/ingress.yaml` terminates TLS with the generated secret.

## GCP Permissions

The cert-manager controller uses GKE Workload Identity to solve DNS-01 challenges through Cloud DNS.

The repo now provisions a dedicated Google service account through OpenTofu and binds it to the `cert-manager` Kubernetes service account.

Required permissions:

1. `roles/dns.admin` on the managed zone.
2. `roles/dns.reader` on the project.

## Certificate Flow

1. Argo CD deploys cert-manager.
2. Argo CD applies the Let’s Encrypt `ClusterIssuer` resources.
3. Argo CD applies the UI `Certificate` resource.
4. cert-manager creates `_acme-challenge` DNS records in Cloud DNS.
5. Let’s Encrypt validates ownership and issues the certificate.
6. GCE Ingress serves HTTPS with the generated TLS secret.
