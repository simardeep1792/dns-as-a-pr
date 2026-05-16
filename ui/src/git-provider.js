class GitProvider {
  getDestination() {
    return {
      provider: "unknown",
      baseBranch: "main"
    };
  }

  async createBranch(_) {
    throw new Error("not implemented");
  }

  async upsertFile(_) {
    throw new Error("not implemented");
  }

  async openPullRequest(_) {
    throw new Error("not implemented");
  }

  async fileExists(_, __) {
    throw new Error("not implemented");
  }

  async getPullRequestStatus(_) {
    throw new Error("not implemented");
  }
}

class AzureDevOpsProvider extends GitProvider {
  constructor({ token, organization, project, repository }) {
    super();
    this.token = token;
    this.organization = organization;
    this.project = project;
    this.repository = repository;
    this.apiBase = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repository)}`;
  }

  get authHeader() {
    return `Bearer ${this.token}`;
  }

  getDestination() {
    return {
      provider: "azure-devops",
      organization: this.organization,
      project: this.project,
      repository: this.repository,
      baseBranch: process.env.GIT_BASE_BRANCH || "main"
    };
  }

  async request(path, options = {}) {
    const url = `${this.apiBase}${path}${path.includes("?") ? "&" : "?"}api-version=7.1`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`azure devops api ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getBranchObjectId(branch) {
    const data = await this.request(`/refs?filter=${encodeURIComponent(`heads/${branch}`)}`);
    const refs = data.value || [];
    if (refs.length === 0) {
      throw new Error(`branch '${branch}' not found`);
    }
    return refs[0].objectId;
  }

  async createBranch({ baseBranch, newBranch }) {
    const oldObjectId = "0000000000000000000000000000000000000000";
    const newObjectId = await this.getBranchObjectId(baseBranch);
    await this.request("/refs", {
      method: "POST",
      body: JSON.stringify([
        {
          name: `refs/heads/${newBranch}`,
          oldObjectId,
          newObjectId
        }
      ])
    });
  }

  async upsertFile({ branch, path, content, message }) {
    const branchObjectId = await this.getBranchObjectId(branch);
    const commit = {
      comment: message,
      changes: [
        {
          changeType: "add",
          item: { path: `/${path}` },
          newContent: {
            content,
            contentType: "rawtext"
          }
        }
      ]
    };

    const existing = await this.fileExists(path, branch);
    if (existing) {
      commit.changes[0].changeType = "edit";
    }

    await this.request("/pushes", {
      method: "POST",
      body: JSON.stringify({
        refUpdates: [
          {
            name: `refs/heads/${branch}`,
            oldObjectId: branchObjectId
          }
        ],
        commits: [commit]
      })
    });
  }

  async openPullRequest({ branch, baseBranch, title, body }) {
    const pr = await this.request("/pullrequests", {
      method: "POST",
      body: JSON.stringify({
        sourceRefName: `refs/heads/${branch}`,
        targetRefName: `refs/heads/${baseBranch}`,
        title,
        description: body
      })
    });

    const webUrl = `https://dev.azure.com/${encodeURIComponent(this.organization)}/${encodeURIComponent(this.project)}/_git/${encodeURIComponent(this.repository)}/pullrequest/${pr.pullRequestId}`;

    return {
      url: webUrl,
      webUrl,
      number: pr.pullRequestId
    };
  }

  async fileExists(path, ref) {
    try {
      const response = await this.request(`/items?path=${encodeURIComponent(`/${path}`)}&versionDescriptor.versionType=branch&versionDescriptor.version=${encodeURIComponent(ref)}&includeContent=false`);
      return Boolean(response.path);
    } catch (error) {
      if (!String(error.message).includes("azure devops api 404:")) {
        throw error;
      }
    }

    const parent = path.split("/").slice(0, -1).join("/");
    const wanted = `/${path}`.toLowerCase();
    try {
      const response = await this.request(`/items?scopePath=${encodeURIComponent(`/${parent}`)}&recursionLevel=OneLevel&versionDescriptor.versionType=branch&versionDescriptor.version=${encodeURIComponent(ref)}&includeContent=false`);
      return (response.value || []).some((item) => String(item.path || "").toLowerCase() === wanted);
    } catch (error) {
      if (String(error.message).includes("azure devops api 404:")) {
        return false;
      }
      throw error;
    }
  }

  async getPullRequestStatus(prNumber) {
    const pr = await this.request(`/pullrequests/${prNumber}`);
    const statuses = await this.request(`/pullRequests/${prNumber}/statuses`);
    const entries = statuses.value || [];

    let checksState = "pending";
    if (entries.length > 0) {
      if (entries.some((status) => String(status.state || "").toLowerCase() === "failed")) {
        checksState = "failed";
      } else if (entries.every((status) => String(status.state || "").toLowerCase() === "succeeded")) {
        checksState = "success";
      }
    }

    return {
      number: pr.pullRequestId,
      state: pr.status,
      merged: pr.status === "completed",
      checksState,
      checks: entries.map((status) => ({
        name: status.context?.name || status.description || "status",
        status: status.state || "pending",
        conclusion: status.state || "pending"
      }))
    };
  }
}

class DryRunProvider extends GitProvider {
  getDestination() {
    return {
      provider: "dry-run",
      organization: process.env.AZDO_ORGANIZATION || "EDIP-PIDE",
      project: process.env.AZDO_PROJECT || "dns-as-a-pr",
      repository: process.env.AZDO_REPOSITORY || "dns-as-a-pr",
      baseBranch: process.env.GIT_BASE_BRANCH || "main"
    };
  }

  async createBranch(_) {}

  async upsertFile(_) {}

  async openPullRequest({ branch, title }) {
    return { url: `dry-run://pr/${branch}?title=${encodeURIComponent(title)}` };
  }

  async fileExists(_path, _ref) {
    return false;
  }

  async getPullRequestStatus(_prNumber) {
    return {
      number: 0,
      state: "open",
      merged: false,
      checksState: "pending",
      checks: []
    };
  }
}

function createProviderFromEnv() {
  const mode = process.env.GIT_PROVIDER_MODE || "dry-run";
  if (mode === "azure-devops") {
    const token = process.env.AZDO_SERVICE_TOKEN;
    const organization = process.env.AZDO_ORGANIZATION;
    const project = process.env.AZDO_PROJECT;
    const repository = process.env.AZDO_REPOSITORY;

    if (!token || !organization || !project || !repository) {
      throw new Error(
        "azure-devops mode requires AZDO_SERVICE_TOKEN, AZDO_ORGANIZATION, AZDO_PROJECT, AZDO_REPOSITORY"
      );
    }

    return new AzureDevOpsProvider({ token, organization, project, repository });
  }

  return new DryRunProvider();
}

export { createProviderFromEnv };
