const form = document.getElementById("request-form");
const previewBtn = document.getElementById("preview-btn");
const submitBtn = document.getElementById("submit-btn");
const recordTypeSelect = document.getElementById("record-type");
const targetHelp = document.getElementById("target-help");
const meta = document.getElementById("meta");
const destination = document.getElementById("destination");
const checks = document.getElementById("checks");
const prSummary = document.getElementById("pr-summary");
const result = document.getElementById("result");
const yamlPreview = document.getElementById("yaml-preview");
const manifestDiff = document.getElementById("manifest-diff");
const copyDiffBtn = document.getElementById("copy-diff-btn");

let isValidated = false;

function renderDestination(info = {}) {
  const providerLabel = info.provider === "azure-devops" || info.provider === "dry-run"
    ? "Azure DevOps destination"
    : "Request destination";

  destination.textContent = [
    providerLabel,
    `${info.organization || "EDIP-PIDE"} / ${info.project || "dns-as-a-pr"} / ${info.repository || "dns-as-a-pr"}`,
    `Target branch: ${info.baseBranch || "main"}`
  ].join("\n");
}

function renderChecks(items = []) {
  if (items.length === 0) {
    checks.textContent = "Validation checks will appear here.";
    return;
  }

  checks.textContent = items
    .map((item) => `${item.status === "pass" ? "PASS" : "FAIL"}  ${item.name}\n${item.detail}`)
    .join("\n\n");
}

function renderSummary(title = "") {
  prSummary.textContent = title
    ? `Pull request title\n${title}`
    : "Pull request title will appear here after validation.";
}

function updateTargetHelp() {
  const type = recordTypeSelect.value;
  const map = {
    A: "Use IPv4 targets such as 203.0.113.10.",
    AAAA: "Use IPv6 targets such as 2001:db8::1.",
    CNAME: "Provide exactly one hostname target such as app.example.net.",
    TXT: "Each TXT value should be wrapped in double quotes, for example \"verify=ok\".",
    NS: "Provide at least two authoritative nameserver hostnames."
  };
  targetHelp.textContent = map[type] || map.A;
}

function resetValidationState() {
  isValidated = false;
  submitBtn.disabled = true;
}

function payloadFromForm() {
  const data = new FormData(form);
  return {
    subdomain: data.get("subdomain"),
    recordType: data.get("recordType"),
    recordTTL: Number(data.get("recordTTL")),
    controlledBy: data.get("controlledBy"),
    projectName: data.get("projectName"),
    projectId: data.get("projectId"),
    sourceRepository: data.get("sourceRepository"),
    owner: data.get("owner"),
    targets: String(data.get("targets") || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  };
}

async function callApi(url, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFromForm())
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "request failed");
  }

  return body;
}

function maybeAutoQuoteTxtTargets() {
  const payload = payloadFromForm();
  if (payload.recordType !== "TXT") {
    return;
  }

  const textarea = form.elements.targets;
  const updated = payload.targets.map((target) => {
    if (target.startsWith('"') && target.endsWith('"')) {
      return target;
    }
    return `"${target}"`;
  });
  textarea.value = updated.join("\n");
}

previewBtn.addEventListener("click", async () => {
  result.textContent = "";
  maybeAutoQuoteTxtTargets();

  try {
    const body = await callApi("/api/validate");
    meta.textContent = `Generated file: ${body.filePath} | Branch: ${body.branch}`;
    renderDestination(body.destination);
    renderChecks(body.checks || []);
    renderSummary(body.title);
    yamlPreview.textContent = body.yaml || "";
    manifestDiff.textContent = body.manifestDiff || "";

    const hasFail = (body.checks || []).some((check) => check.status !== "pass");
    isValidated = !hasFail;
    submitBtn.disabled = hasFail;

    if (body.warnings?.length) {
      result.textContent = `Warnings: ${body.warnings.join("; ")}`;
    } else if (!hasFail) {
      result.textContent = "Validation passed. You can now create the Azure DevOps pull request.";
    } else {
      result.textContent = "Validation failed. Review the checks before submitting.";
    }
  } catch (error) {
    isValidated = false;
    submitBtn.disabled = true;
    result.textContent = error.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isValidated) {
    result.textContent = "Validate the request before submitting it.";
    return;
  }

  result.textContent = "Opening pull request...";

  try {
    const body = await callApi("/api/requests");
    result.textContent = "Pull request created: ";
    const link = document.createElement("a");
    link.href = body.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = body.url;
    result.appendChild(link);
    renderDestination(body.destination);
  } catch (error) {
    result.textContent = error.message;
  }
});

form.addEventListener("input", () => {
  resetValidationState();
});

recordTypeSelect.addEventListener("change", () => {
  updateTargetHelp();
  resetValidationState();
});

copyDiffBtn.addEventListener("click", async () => {
  const text = manifestDiff.textContent || "";
  if (!text) {
    result.textContent = "No manifest diff to copy. Validate the request first.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    result.textContent = "Manifest diff copied to clipboard.";
  } catch (_error) {
    result.textContent = "Could not copy diff. Please copy it manually.";
  }
});

updateTargetHelp();
renderDestination();
renderChecks();
renderSummary();
