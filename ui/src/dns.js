const RECORD_TYPES = new Set(["A", "AAAA", "CNAME", "TXT", "NS"]);

function validateSubdomain(subdomain) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain);
}

function isLikelyHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function normalizeRequest(input) {
  const subdomain = String(input.subdomain || "").trim().toLowerCase();
  const recordType = String(input.recordType || "").trim().toUpperCase();
  const owner = String(input.owner || "").trim();
  const controlledBy = String(input.controlledBy || "").trim();
  const projectName = String(input.projectName || "").trim();
  const projectId = String(input.projectId || "").trim();
  const sourceRepository = String(input.sourceRepository || "").trim();
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

  if (!controlledBy) {
    throw new Error("controlled-by is required");
  }

  if (!projectName) {
    throw new Error("project-name is required");
  }

  if (!projectId) {
    throw new Error("project-id is required");
  }

  if (!sourceRepository || !isLikelyHttpUrl(sourceRepository)) {
    throw new Error("source-repository must be a valid http/https URL");
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
    owner,
    controlledBy,
    projectName,
    projectId,
    sourceRepository
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
    "  annotations:",
    `    simardeep.xyz/source-repository: \"${req.sourceRepository}\"`,
    "    simardeep.xyz/zone-scope: \"simardeep-xyz\"",
    "  labels:",
    `    simardeep.xyz/controlled-by: \"${req.controlledBy}\"`,
    `    simardeep.xyz/project-name: \"${req.projectName}\"`,
    `    simardeep.xyz/project-id: \"${req.projectId}\"`,
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
