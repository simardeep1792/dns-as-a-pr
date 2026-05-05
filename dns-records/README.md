# DNS Records Contract (`dns-records/`)

This directory is the self-service interface for `simardeep.xyz`.
Each file is an ExternalDNS `DNSEndpoint` custom resource. ArgoCD applies these manifests into the `dns` namespace, and ExternalDNS reconciles them into Google Cloud DNS.

## Naming Convention

1. One file per subdomain (recommended).
2. Filename should be the fully qualified subdomain:
   - Example: `blog.simardeep.xyz.yaml`

## Allowed Record Types

Only these record types are accepted by CI:

`A`, `AAAA`, `CNAME`, `NS`, `TXT`, `MX`

## DNS Name Rules

1. Every `dnsName` must end in `.simardeep.xyz`.
2. The apex `simardeep.xyz` is not allowed (no records at the root).

## TTL Rules

`ttl` must be an integer between `60` and `86400`.

## Targets Rules

1. Every endpoint must have a non-empty `targets` list.
2. For `NS` records: at least **2** targets are required.

## How to Add a Record

1. Copy an example from `dns-records/_examples/`.
   - Or start from `dns-records/_template.yaml.txt`.
2. Create a new file named `<subdomain>.simardeep.xyz.yaml`.
3. Set `dnsName`, `recordType`, `ttl`, and `targets`.
4. Open a pull request.

CI will validate:

1. YAML syntax
2. DNSEndpoint schema
3. Policy checks (domain suffix, allowed record types, TTL range, targets non-empty, NS redundancy)

After merge, ExternalDNS typically reconciles within minutes.

## Patterns (with full examples)

### Pattern 1: A record (IPv4)

Use this when you have a stable public IPv4 address.

Example: `dns-records/_examples/a-record.yaml.txt`

### Pattern 2: CNAME (hostname target)

Use this when your provider gives you a hostname (Vercel/Netlify/etc).

Example: `dns-records/_examples/cname-record.yaml.txt`

### Pattern 3: NS delegation (delegate a subdomain zone)

Use this when you operate your own authoritative DNS for a subdomain, e.g. `project.simardeep.xyz`.
Submitting `NS` records delegates *all* DNS below that subdomain to the nameservers you provide.

What you are responsible for after delegation:

1. Keeping your nameservers online and stable.
2. Managing all records under the delegated subdomain.
3. Ensuring your zone contains any required records (including `A`, `AAAA`, `MX`, `TXT`, etc).

Example: `dns-records/_examples/ns-delegation.yaml.txt`
