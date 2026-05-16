import assert from 'node:assert/strict';
import test from 'node:test';

import { filePathFor, normalizeRequest, renderYaml } from '../src/dns.js';

const baseRequest = {
  subdomain: 'app',
  recordType: 'A',
  recordTTL: 300,
  targets: ['203.0.113.10'],
  owner: 'Platform Team',
  controlledBy: 'dns-as-a-pr',
  projectName: 'DNS platform',
  projectId: 'edip-aurora-fgc',
  sourceRepository: 'https://dev.azure.com/EDIP-PIDE/dns-as-a-pr/_git/dns-as-a-pr'
};

test('normalizes a valid A record request', () => {
  const req = normalizeRequest(baseRequest);

  assert.equal(req.subdomain, 'app');
  assert.equal(req.zone, 'simardeep.xyz');
  assert.equal(req.recordType, 'A');
  assert.deepEqual(req.targets, ['203.0.113.10']);
});

test('renders the DNSEndpoint manifest with audit metadata', () => {
  const yaml = renderYaml(normalizeRequest(baseRequest));

  assert.match(yaml, /kind: DNSEndpoint/);
  assert.match(yaml, /name: app-simardeep-xyz/);
  assert.match(yaml, /simardeep\.xyz\/source-repository: "https:\/\/dev\.azure\.com\/EDIP-PIDE\/dns-as-a-pr\/_git\/dns-as-a-pr"/);
  assert.match(yaml, /simardeep\.xyz\/project-id: "edip-aurora-fgc"/);
  assert.match(yaml, /dnsName: "app\.simardeep\.xyz"/);
  assert.match(yaml, /recordType: "A"/);
});

test('supports NS delegation requests with at least two nameservers', () => {
  const req = normalizeRequest({
    ...baseRequest,
    subdomain: 'delegated',
    recordType: 'NS',
    targets: ['ns-cloud-b1.googledomains.com', 'ns-cloud-b2.googledomains.com']
  });

  assert.equal(req.recordType, 'NS');
  assert.equal(req.targets.length, 2);
});

test('supports AAAA record requests with valid IPv6 targets', () => {
  const req = normalizeRequest({
    ...baseRequest,
    recordType: 'AAAA',
    targets: ['2001:db8::10']
  });

  assert.equal(req.recordType, 'AAAA');
  assert.deepEqual(req.targets, ['2001:db8::10']);
});

test('supports CNAME record requests with one canonical DNS name', () => {
  const req = normalizeRequest({
    ...baseRequest,
    recordType: 'CNAME',
    targets: ['target.example.com']
  });

  assert.equal(req.recordType, 'CNAME');
  assert.deepEqual(req.targets, ['target.example.com']);
});

test('supports TXT record requests with quoted values', () => {
  const req = normalizeRequest({
    ...baseRequest,
    recordType: 'TXT',
    targets: ['"google-site-verification=abc123"']
  });

  assert.equal(req.recordType, 'TXT');
  assert.deepEqual(req.targets, ['"google-site-verification=abc123"']);
});

test('rejects NS delegation requests with one nameserver', () => {
  assert.throws(
    () => normalizeRequest({ ...baseRequest, recordType: 'NS', targets: ['ns-cloud-b1.googledomains.com'] }),
    /NS records must have at least two targets/
  );
});

test('rejects invalid A, AAAA, CNAME, and TXT targets', () => {
  assert.throws(
    () => normalizeRequest({ ...baseRequest, recordType: 'A', targets: ['999.1.1.1'] }),
    /valid IPv4 address/
  );

  assert.throws(
    () => normalizeRequest({ ...baseRequest, recordType: 'AAAA', targets: ['not-ipv6'] }),
    /valid IPv6 address/
  );

  assert.throws(
    () => normalizeRequest({ ...baseRequest, recordType: 'CNAME', targets: ['bad-.example.com'] }),
    /valid FQDN/
  );

  assert.throws(
    () => normalizeRequest({ ...baseRequest, recordType: 'TXT', targets: ['unquoted-text'] }),
    /wrapped in double quotes/
  );
});

test('rejects missing source repository metadata', () => {
  assert.throws(
    () => normalizeRequest({ ...baseRequest, sourceRepository: '' }),
    /source-repository must be a valid http\/https URL/
  );
});

test('rejects non-Azure DevOps source repositories', () => {
  assert.throws(
    () => normalizeRequest({ ...baseRequest, sourceRepository: 'https://github.com/example/app' }),
    /source-repository must point to Azure DevOps/
  );
});

test('uses deterministic DNS record file paths', () => {
  assert.equal(filePathFor('app'), 'dns-records/app.simardeep.xyz.yaml');
});
