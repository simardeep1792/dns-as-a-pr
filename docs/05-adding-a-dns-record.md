# Adding a DNS Record

This is the developer journey: Git PR -> CI validation -> merge -> record appears in Cloud DNS.

## Steps

1. Clone the repo and create a branch.
2. Copy an example from `dns-records/_examples/`.
3. Create `dns-records/<subdomain>.simardeep.xyz.yaml`.
4. Fill in:
   - `spec.endpoints[].dnsName`
   - `recordType`
   - `ttl`
   - `targets`
5. Open a pull request.

## What CI Checks

1. YAML syntax
2. DNSEndpoint schema
3. Policy rules:
   - only `.simardeep.xyz` (no apex)
   - allowed types (A/AAAA/CNAME/NS/TXT/MX)
   - TTL range 60..86400
   - targets non-empty (and NS >= 2)

## After Merge: Verify

```bash
dig +short <subdomain>.simardeep.xyz A
dig +short <subdomain>.simardeep.xyz CNAME
dig +short <subdomain>.simardeep.xyz NS
```

If the record exists in Cloud DNS but you do not see it externally, wait for TTL/propagation.
