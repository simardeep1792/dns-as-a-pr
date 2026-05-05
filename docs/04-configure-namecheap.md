# Configuring Namecheap Nameservers

Goal: delegate `simardeep.xyz` authority from Namecheap to Google Cloud DNS.

## Get Nameservers from OpenTofu

```bash
cd infra/envs/poc
tofu output -json name_servers
```

## Update Namecheap

In Namecheap for `simardeep.xyz`:

1. Go to Domain List -> Manage
2. Find Nameservers
3. Select "Custom DNS"
4. Enter the **exact** nameserver list from `tofu output` (one per line)
5. Save

## Propagation

Propagation can take minutes to hours.

Verify delegation:

```bash
dig +short NS simardeep.xyz
```

You should see the same nameservers Cloud DNS assigned.
