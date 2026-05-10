const RECORD_TYPES = new Set(["A", "AAAA", "CNAME", "TXT", "NS"]);

function validateSubdomain(subdomain) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain);
}

function normalizeRequest(input) {
  const subdomain = String(input.subdomain || "").trim().toLowerCase();
  const recordType = String(input.recordType || "").trim().toUpperCase();
  const owner = String(input.owner || "").trim();
  const ttl = Number(input.recordTTL);
  const targets = Array.isArray(input.targets)
    ? input.targets.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!validateSubdomain(subdomain)) {
    throw new Error("subdomain must be lower-case, alphanumeric, and may include hyphens");
  }

  if (!RECORD_TYPES.has(recordType)) {
    throw new Error("recordType must be one of A, AAAA, CNAME, TXT, NS");
  }

  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error("recordTTL must be a positive integer");
  }

  if (!owner) {
    throw new Error("owner is required");
  }

  if (targets.length === 0) {
    throw new Error("at least one target is required");
  }

  return {
    subdomain,
    zone: "simardeep.xyz",
    recordType,
    recordTTL: ttl,
    targets,
    owner
  };
}

function manifestName(subdomain) {
  return `${subdomain}-simardeep-xyz`;
}

function filePathFor(subdomain) {
  return `dns-records/${subdomain}.simardeep.xyz.yaml`;
}

function branchNameFor(subdomain) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `dns-request/${subdomain}-${stamp}`;
}

function renderYaml(req) {
  const lines = [
    "apiVersion: externaldns.k8s.io/v1alpha1",
    "kind: DNSEndpoint",
    "metadata:",
    `  name: ${manifestName(req.subdomain)}`,
    "  namespace: dns",
    "  labels:",
    `    simardeep.xyz/owner: \"${req.owner}\"`,
    "spec:",
    "  endpoints:",
    `    - dnsName: ${req.subdomain}.${req.zone}`,
    `      recordType: ${req.recordType}`,
    `      recordTTL: ${req.recordTTL}`,
    "      targets:"
  ];

  for (const target of req.targets) {
    lines.push(`        - ${target}`);
  }

  return `${lines.join("\n")}\n`;
}

export { normalizeRequest, renderYaml, filePathFor, branchNameFor };
