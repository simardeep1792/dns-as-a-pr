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
const recordTypeSelect = document.getElementById("record-type");
const targetHelp = document.getElementById("target-help");
const submitBtn = document.getElementById("submit-btn");
const prevStepBtn = document.getElementById("prev-step-btn");
const nextStepBtn = document.getElementById("next-step-btn");
const stepper = document.getElementById("stepper");
const steps = Array.from(document.querySelectorAll(".step"));

let currentStep = 1;
let isValidated = false;

function updateTargetHelp() {
  const type = recordTypeSelect.value;
  const map = {
    A: "For A records, enter IPv4 values such as 203.0.113.10.",
    AAAA: "For AAAA records, enter IPv6 values such as 2001:db8::1.",
    CNAME: "For CNAME, provide one target hostname like app.example.net.",
    TXT: "For TXT, wrap each value in double quotes, for example \"verify=ok\".",
    NS: "For NS, provide at least two nameserver hostnames."
  };
  targetHelp.textContent = map[type] || map.A;
}

function setStep(stepNumber) {
  currentStep = Math.max(1, Math.min(3, stepNumber));
  steps.forEach((step, index) => {
    step.classList.toggle("hidden", index + 1 !== currentStep);
  });

  const bullets = stepper.querySelectorAll("li");
  bullets.forEach((bullet, index) => {
    bullet.classList.toggle("active", index + 1 === currentStep);
  });

  prevStepBtn.disabled = currentStep === 1;
  nextStepBtn.disabled = currentStep === 3;
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

function formatChecks(items) {
  if (!items || items.length === 0) {
    return "";
  }

  return items
    .map((item) => `${item.status === "pass" ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`)
    .join("\n");
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
    yamlPreview.textContent = body.yaml;
    meta.textContent = `Path: ${body.filePath} | Branch: ${body.branch}`;
    checks.textContent = formatChecks(body.checks);
    prSummary.textContent = `PR title: ${body.title}`;
    manifestDiff.textContent = body.manifestDiff || "";
    if (body.warnings?.length) {
      result.textContent = `Warnings: ${body.warnings.join("; ")}`;
    }
    const hasFail = (body.checks || []).some((check) => check.status !== "pass");
    isValidated = !hasFail;
    submitBtn.disabled = hasFail;
    if (!hasFail) {
      result.textContent = result.textContent || "Validation passed. You can now create the pull request.";
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
    result.textContent = "Validate request first."
    return;
  }
  result.textContent = "Submitting...";
  try {
    const body = await callApi("/api/requests");
    result.innerHTML = `Pull request created: <a href="${body.url}" target="_blank" rel="noreferrer">${body.url}</a>`;
    prStatusInput.value = body.url;
  } catch (error) {
    result.textContent = error.message;
  }
});

recordTypeSelect.addEventListener("change", () => {
  updateTargetHelp();
  resetValidationState();
});

form.addEventListener("input", () => {
  resetValidationState();
});

prevStepBtn.addEventListener("click", () => {
  setStep(currentStep - 1);
});

nextStepBtn.addEventListener("click", () => {
  const requiredFieldsByStep = {
    1: ["subdomain", "recordType", "recordTTL", "targets"],
    2: ["controlledBy", "projectName", "projectId", "sourceRepository", "owner"]
  };

  const fields = requiredFieldsByStep[currentStep] || [];
  for (const name of fields) {
    const input = form.elements[name];
    if (input && !input.reportValidity()) {
      return;
    }
  }

  setStep(currentStep + 1);
});

setStep(1);
updateTargetHelp();

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
