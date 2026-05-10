const form = document.getElementById("request-form");
const previewBtn = document.getElementById("preview-btn");
const yamlPreview = document.getElementById("yaml-preview");
const meta = document.getElementById("meta");
const result = document.getElementById("result");

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

previewBtn.addEventListener("click", async () => {
  result.textContent = "";
  try {
    const body = await callApi("/api/preview");
    yamlPreview.textContent = body.yaml;
    meta.textContent = `Path: ${body.filePath} | Branch: ${body.branch}`;
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
  } catch (error) {
    result.textContent = error.message;
  }
});
