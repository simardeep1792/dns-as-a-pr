# Delegating a Subdomain Zone (NS)

Delegation creates `NS` records for a subdomain, e.g. `project.simardeep.xyz`, pointing at nameservers you control.
After delegation, your nameservers are authoritative for *everything* under that subdomain.

## Before You Request Delegation

1. Create the delegated zone on your side (Cloud DNS / Route53 / etc).
2. Confirm your nameservers answer authoritatively for that zone.
3. Ensure you have at least 2 nameservers.

## Submit the PR

1. Create `dns-records/project.simardeep.xyz.yaml` with a `DNSEndpoint` containing an `NS` endpoint.
2. Add at least two `targets` (nameservers).
3. Open a PR using the "Zone delegation" template.

## After Merge: Verify

```bash
dig +short project.simardeep.xyz NS
```

Then validate a record managed in your delegated zone resolves correctly.
