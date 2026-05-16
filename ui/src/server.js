import express from "express";
import dns from "dns/promises";
import net from "net";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { branchNameFor, filePathFor, normalizeRequest, renderYaml } from "./dns.js";
import { createProviderFromEnv } from "./git-provider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const gcdsDir = path.resolve(__dirname, "../node_modules/@gcds-core/components/dist/gcds");
const repoRoot = path.resolve(__dirname, "../..");

const app = express();
const port = Number(process.env.PORT || 8080);
const baseBranch = process.env.GIT_BASE_BRANCH || "main";
const provider = createProviderFromEnv();
const authoritativeServer = process.env.AUTHORITATIVE_DNS_SERVER || "ns-cloud-e1.googledomains.com";
const destination = provider.getDestination();

function parseCsvSet(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

const policy = {
  allowedZone: process.env.ALLOWED_DNS_ZONE || "simardeep.xyz",
  protectedSubdomains: parseCsvSet(process.env.PROTECTED_SUBDOMAINS),
  allowedPrefixes: parseCsvSet(process.env.ALLOWED_SUBDOMAIN_PREFIXES)
};

app.use(express.json({ limit: "32kb" }));
app.use("/gcds", express.static(gcdsDir));
app.use(express.static(publicDir));

function describeRecordType(recordType) {
  return {
    A: "Maps a hostname to one or more IPv4 addresses.",
    AAAA: "Maps a hostname to one or more IPv6 addresses.",
    CNAME: "Creates an alias from this hostname to one canonical DNS name.",
    TXT: "Publishes a text value such as domain verification, SPF, DKIM, or service metadata.",
    NS: "Delegates this subdomain to another DNS zone using authoritative nameservers."
  }[recordType] || "Updates a DNS record through the GitOps DNS workflow.";
}

function buildPullRequestBody({ normalized, filePath, branch, baseBranch, yaml }) {
  const host = `${normalized.subdomain}.${normalized.zone}`;
  const targets = normalized.targets.map((target) => `  - ${target}`).join("\n");
  const warnings = normalized.warnings.length > 0
    ? normalized.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- None";

  return [
    "## DNS Change Request",
    "",
    "This pull request is the approval ticket for a DNS change requested through `dns-request-ui`.",
    "The DNS record is not applied until this PR passes validation, is approved by a reviewer, and is merged.",
    "",
    "## Requested Record",
    "",
    `- Host: ${host}`,
    `- Record type: ${normalized.recordType}`,
    `- Record purpose: ${describeRecordType(normalized.recordType)}`,
    `- TTL: ${normalized.recordTTL} seconds`,
    "- Targets:",
    targets,
    "",
    "## Requester And Ownership",
    "",
    `- Owner/team: ${normalized.owner}`,
    `- Project name: ${normalized.projectName}`,
    `- Project ID: ${normalized.projectId}`,
    `- Source repository: ${normalized.sourceRepository}`,
    `- Controlled by: ${normalized.controlledBy}`,
    "",
    "## Generated Change",
    "",
    `- Target branch: ${baseBranch}`,
    `- Request branch: ${branch}`,
    `- Manifest path: ${filePath}`,
    "- Resource kind: `DNSEndpoint`",
    "- DNS provider action: Argo CD applies this manifest after merge, then ExternalDNS reconciles it into Google Cloud DNS.",
    "",
    "## Reviewer Checklist",
    "",
    "- Confirm the requester owns or is accountable for the service using this DNS name.",
    "- Confirm the hostname, record type, TTL, and targets are correct for the intended service.",
    "- Confirm this request does not conflict with an existing record or delegation.",
    "- Confirm Azure Pipelines validation succeeds before merge.",
    "- Merge only after review approval. Closing this PR rejects the DNS request.",
    "",
    "## Validation Notes",
    "",
    warnings,
    "",
    "## Generated Manifest Preview",
    "",
    "```yaml",
    yaml.trimEnd(),
    "```"
  ].join("\n");
}

function safeRequestedBranch(value, subdomain) {
  const branch = String(value || "").trim();
  if (!branch) {
    return "";
  }

  const prefix = `dns-request/${subdomain}-`;
  if (!branch.startsWith(prefix) || !/^[A-Za-z0-9._/-]+$/.test(branch)) {
    return "";
  }

  return branch;
}

function buildRequestArtifacts(payload) {
  const normalized = normalizeRequest(payload, policy);
  const yaml = renderYaml(normalized);
  const filePath = filePathFor(normalized.subdomain);
  const branch = safeRequestedBranch(payload.requestBranch, normalized.subdomain) || branchNameFor(normalized.subdomain);
  const title = `DNS: ${normalized.subdomain}.${normalized.zone} ${normalized.recordType}`;
  const body = buildPullRequestBody({ normalized, filePath, branch, baseBranch, yaml });

  return { normalized, yaml, filePath, branch, title, body };
}

function parsePullRequestNumber(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const pullIndex = parts.indexOf("pull");
    if (pullIndex >= 0 && parts[pullIndex + 1]) {
      return Number(parts[pullIndex + 1]);
    }
    const gitIndex = parts.indexOf("_git");
    if (gitIndex >= 0) {
      const token = parts[parts.length - 1];
      if (token && /^\d+$/.test(token)) {
        return Number(token);
      }
    }
  } catch (_error) {
    return Number(value);
  }

  return Number.NaN;
}

async function resolveRecord(resolver, recordType, fqdn) {
  if (recordType === "A") {
    return resolver.resolve4(fqdn);
  }
  if (recordType === "AAAA") {
    return resolver.resolve6(fqdn);
  }
  if (recordType === "CNAME") {
    return resolver.resolveCname(fqdn);
  }
  if (recordType === "TXT") {
    const records = await resolver.resolveTxt(fqdn);
    return records.map((record) => record.join(""));
  }
  if (recordType === "NS") {
    return resolver.resolveNs(fqdn);
  }

  return [];
}

async function resolveDnsState(hostname, recordType = "A") {
  const fqdn = `${hostname}.${policy.allowedZone}`;
  const normalizedRecordType = String(recordType || "A").trim().toUpperCase();
  const resolver = new dns.Resolver();
  let authoritativeResolverServer = authoritativeServer;
  if (net.isIP(authoritativeServer) === 0) {
    try {
      const resolved = await dns.resolve4(authoritativeServer);
      if (resolved.length > 0) {
        authoritativeResolverServer = resolved[0];
      }
    } catch (_error) {
      authoritativeResolverServer = authoritativeServer;
    }
  }
  resolver.setServers([authoritativeResolverServer]);

  let recursive = [];
  let authoritative = [];

  try {
    recursive = await resolveRecord(dns, normalizedRecordType, fqdn);
  } catch (_error) {
    recursive = [];
  }

  try {
    authoritative = await resolveRecord(resolver, normalizedRecordType, fqdn);
  } catch (_error) {
    authoritative = [];
  }

  return {
    host: fqdn,
    recordType: normalizedRecordType,
    recursive,
    authoritative,
    live: recursive.length > 0 || authoritative.length > 0
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: process.env.GIT_PROVIDER_MODE || "dry-run" });
});

app.post("/api/preview", (req, res) => {
  try {
    const artifacts = buildRequestArtifacts(req.body);
    res.json({
      filePath: artifacts.filePath,
      branch: artifacts.branch,
      title: artifacts.title,
      yaml: artifacts.yaml,
      destination
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/validate", async (req, res) => {
  try {
    const artifacts = buildRequestArtifacts(req.body);
    const localPath = path.resolve(repoRoot, artifacts.filePath);
    const localExists = fs.existsSync(localPath);
    const remoteExists = await provider.fileExists(artifacts.filePath, baseBranch);
    const exists = localExists || remoteExists;

    const checks = [
      {
        name: "policy-validation",
        status: "pass",
        detail: "metadata, hostname, and target formats are valid"
      },
      {
        name: "file-conflict",
        status: exists ? "fail" : "pass",
        detail: exists
          ? `record file already exists at ${artifacts.filePath}`
          : "no existing record file conflict"
      }
    ];

    const hasFailure = checks.some((check) => check.status === "fail");
    res.json({
      ok: !hasFailure,
      checks,
      title: artifacts.title,
      body: artifacts.body,
      yaml: artifacts.yaml,
      filePath: artifacts.filePath,
      branch: artifacts.branch,
      destination,
      warnings: artifacts.normalized.warnings,
      manifestDiff: [
        `--- /dev/null`,
        `+++ b/${artifacts.filePath}`,
        ...artifacts.yaml.split("\n").filter(Boolean).map((line) => `+${line}`)
      ].join("\n")
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const artifacts = buildRequestArtifacts(req.body);
    const localPath = path.resolve(repoRoot, artifacts.filePath);
    const localExists = fs.existsSync(localPath);
    const remoteExists = await provider.fileExists(artifacts.filePath, baseBranch);
    const exists = localExists || remoteExists;
    if (exists) {
      return res.status(409).json({
        error: `record file already exists at ${artifacts.filePath}. update the existing manifest instead of creating a duplicate.`
      });
    }
    await provider.createBranch({ baseBranch, newBranch: artifacts.branch });
    await provider.upsertFile({
      branch: artifacts.branch,
      path: artifacts.filePath,
      content: artifacts.yaml,
      message: `Add DNS record for ${artifacts.normalized.subdomain}.${artifacts.normalized.zone}`
    });
    const pr = await provider.openPullRequest({
      branch: artifacts.branch,
      baseBranch,
      title: artifacts.title,
      body: artifacts.body
    });

    res.status(201).json({
      url: pr.webUrl || pr.url,
      pullRequestNumber: pr.number || parsePullRequestNumber(pr.webUrl || pr.url),
      branch: artifacts.branch,
      filePath: artifacts.filePath,
      destination
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/pr-status", async (req, res) => {
  try {
    const pr = String(req.query.pr || "").trim();
    const subdomain = String(req.query.subdomain || "").trim().toLowerCase();
    const recordType = String(req.query.recordType || "A").trim().toUpperCase();

    if (!pr) {
      return res.status(400).json({ error: "pr query param is required" });
    }

    if (!subdomain) {
      return res.status(400).json({ error: "subdomain query param is required" });
    }

    const number = parsePullRequestNumber(pr);
    if (!Number.isInteger(number) || number <= 0) {
      return res.status(400).json({ error: "pr must be a pull request number or URL" });
    }

    const prStatus = await provider.getPullRequestStatus(number);
    const dnsState = await resolveDnsState(subdomain, recordType);

    res.json({
      pullRequest: prStatus,
      dns: dnsState
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  process.stdout.write(`dns-request-ui listening on :${port}\n`);
});
