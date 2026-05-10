const RECORD_TYPES = new Set(["A", "AAAA", "CNAME", "TXT", "NS"]);
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_PATTERN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;
const FQDN_PATTERN = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(\.(?!-)[A-Za-z0-9-]{1,63})+\.?$/;

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

function isValidFqdn(value) {
  return FQDN_PATTERN.test(value);
}

function validateTargets(recordType, targets) {
  const errors = [];
  for (const target of targets) {
    if (recordType === "A" && !IPV4_PATTERN.test(target)) {
      errors.push(`target '${target}' must be a valid IPv4 address for A records`);
    }
    if (recordType === "AAAA" && !IPV6_PATTERN.test(target)) {
      errors.push(`target '${target}' must be a valid IPv6 address for AAAA records`);
    }
    if ((recordType === "CNAME" || recordType === "NS") && !isValidFqdn(target)) {
      errors.push(`target '${target}' must be a valid FQDN for ${recordType} records`);
    }
    if (recordType === "TXT" && !(target.startsWith('"') && target.endsWith('"'))) {
      errors.push(`target '${target}' must be wrapped in double quotes for TXT records`);
    }
  }

  if (recordType === "CNAME" && targets.length !== 1) {
    errors.push("CNAME records must have exactly one target");
  }

  if (recordType === "NS" && targets.length < 2) {
    errors.push("NS records must have at least two targets");
  }

  return errors;
}

function validatePolicy(subdomain, zone, policy) {
  const errors = [];
  const warnings = [];

  if (policy.allowedZone && zone !== policy.allowedZone) {
    errors.push(`zone '${zone}' is not allowed`);
  }

  if (subdomain === "@" || subdomain.includes("*")) {
    errors.push("apex '@' and wildcard '*' subdomains are not allowed");
  }

  if (policy.protectedSubdomains.has(subdomain)) {
    errors.push(`subdomain '${subdomain}' is protected`);
  }

  if (policy.allowedPrefixes.size > 0) {
    const matched = [...policy.allowedPrefixes].some((prefix) => subdomain.startsWith(`${prefix}-`) || subdomain === prefix);
    if (!matched) {
      errors.push(`subdomain '${subdomain}' must start with one of allowed prefixes: ${[...policy.allowedPrefixes].join(", ")}`);
    }
  }

  if (subdomain.length < 3) {
    warnings.push("very short subdomains are easy to mistype");
  }

  return { errors, warnings };
}

function normalizeRequest(input, policy = {}) {
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

  const zone = String(input.zone || "simardeep.xyz").trim().toLowerCase();

  const policyResult = validatePolicy(subdomain, zone, {
    allowedZone: policy.allowedZone || "simardeep.xyz",
    protectedSubdomains: policy.protectedSubdomains || new Set(),
    allowedPrefixes: policy.allowedPrefixes || new Set()
  });

  const targetErrors = validateTargets(recordType, targets);
  const allErrors = [...policyResult.errors, ...targetErrors];

  if (allErrors.length > 0) {
    throw new Error(allErrors.join("; "));
  }

  return {
    subdomain,
    zone,
    recordType,
    recordTTL: ttl,
    targets,
    owner,
    controlledBy,
    projectName,
    projectId,
    sourceRepository,
    warnings: policyResult.warnings
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
