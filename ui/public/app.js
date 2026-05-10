const form = document.getElementById("request-form");
const previewBtn = document.getElementById("preview-btn");
const yamlPreview = document.getElementById("yaml-preview");
const meta = document.getElementById("meta");
const result = document.getElementById("result");
const checks = document.getElementById("checks");
const prSummary = document.getElementById("pr-summary");
const manifestDiff = document.getElementById("manifest-diff");
const copyDiffBtn = document.getElementById("copy-diff-btn");
const refreshStatusBtn = document.getElementById("refresh-status-btn");
const prStatusInput = document.getElementById("pr-status-input");
const prStatusOutput = document.getElementById("pr-status-output");

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

function formatChecks(items) {
  if (!items || items.length === 0) {
    return "";
  }

  return items
    .map((item) => `${item.status === "pass" ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`)
    .join("\n");
}

previewBtn.addEventListener("click", async () => {
  result.textContent = "";
  try {
    const body = await callApi("/api/validate");
    yamlPreview.textContent = body.yaml;
    meta.textContent = `Path: ${body.filePath} | Branch: ${body.branch}`;
    checks.textContent = formatChecks(body.checks);
    prSummary.textContent = `PR title: ${body.title}`;
    manifestDiff.textContent = body.manifestDiff || "";
    if (body.warnings?.length) {
      result.textContent = `Warnings: ${body.warnings.join("; ")}`;
    }
  } catch (error) {
    result.textContent = error.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.textContent = "Submitting...";
  try {
    const body = await callApi("/api/requests");
    result.innerHTML = `Pull request created: <a href="${body.url}" target="_blank" rel="noreferrer">${body.url}</a>`;
    prStatusInput.value = body.url;
  } catch (error) {
    result.textContent = error.message;
  }
});

copyDiffBtn.addEventListener("click", async () => {
  const text = manifestDiff.textContent || "";
  if (!text) {
    result.textContent = "No manifest diff to copy. Validate first.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    result.textContent = "Manifest diff copied to clipboard.";
  } catch (_error) {
    result.textContent = "Could not copy diff. Please copy manually.";
  }
});

refreshStatusBtn.addEventListener("click", async () => {
  const prRef = prStatusInput.value.trim();
  const payload = payloadFromForm();
  if (!prRef) {
    prStatusOutput.textContent = "Provide a PR URL or PR number.";
    return;
  }

  try {
    const response = await fetch(
      `/api/pr-status?pr=${encodeURIComponent(prRef)}&subdomain=${encodeURIComponent(payload.subdomain)}`
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "status check failed");
    }

    prStatusOutput.textContent = [
      `PR #${body.pullRequest.number}`,
      `State: ${body.pullRequest.state}`,
      `Merged: ${body.pullRequest.merged}`,
      `Checks: ${body.pullRequest.checksState}`,
      "",
      "Check runs:",
      ...(body.pullRequest.checks || []).map(
        (check) => `- ${check.name}: ${check.status}/${check.conclusion}`
      ),
      "",
      `DNS host: ${body.dns.host}`,
      `DNS live: ${body.dns.live}`,
      `Recursive: ${(body.dns.recursive || []).join(", ") || "none"}`,
      `Authoritative: ${(body.dns.authoritative || []).join(", ") || "none"}`
    ].join("\n");
  } catch (error) {
    prStatusOutput.textContent = error.message;
  }
});
