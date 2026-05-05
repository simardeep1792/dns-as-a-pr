---
name: Zone delegation
about: Delegate a subdomain via NS records (hands off authority to your nameservers)
---

## Delegation Request

- Subdomain being delegated: `___.simardeep.xyz`
- Nameservers (at least 2):
  - `___`
  - `___`

## Authoritative Infrastructure

What is authoritative for the delegated zone (Cloud DNS zone name, provider, cluster, etc.)?

## Ownership / Contact

- Zone owner (name or team):
- Contact (email/GitHub):

## Stability Confirmation

Confirm the nameservers are stable and operational:

## Checklist

- [ ] I understand NS delegation hands authority for everything under this subdomain to the nameservers listed above.
- [ ] I confirm at least 2 nameservers are provided.
- [ ] I created a file in `dns-records/` following the naming convention.
- [ ] CI is passing.
- [ ] I read `dns-records/README.md`.
