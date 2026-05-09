## DNS Change

- Subdomain:
- Record type: `A | AAAA | CNAME | TXT | NS`
- Target value(s):
- Owner/contact:

## Checklist

- [ ] I changed one file under `dns-records/`.
- [ ] The manifest uses `apiVersion: externaldns.k8s.io/v1alpha1` and `kind: DNSEndpoint`.
- [ ] The record is under `.simardeep.xyz`.
- [ ] I used `recordTTL` between `60` and `86400`.
- [ ] CI is passing.
