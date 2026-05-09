---
name: DNS record
about: Add/update A, AAAA, CNAME, TXT records under simardeep.xyz
---

## Request

- Subdomain: `___`
- Record type: `A | AAAA | CNAME | TXT`
- Target value(s): `___`
- TTL (seconds): `___`

## What This Is For

Describe the project/workload this subdomain serves:

## Ownership / Contact

- Owner (name or team):
- Contact (email/GitHub):

## Stability

Confirm the target is stable (not an ephemeral IP/hostname):

## Checklist

- [ ] I created a file in `dns-records/` following the naming convention (`<subdomain>.simardeep.xyz.yaml`).
- [ ] The manifest is a `DNSEndpoint` and only declares records under `.simardeep.xyz`.
- [ ] CI is passing.
- [ ] I verified the target is reachable and correct.
- [ ] I read `dns-records/README.md`.
