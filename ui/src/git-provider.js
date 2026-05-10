class GitProvider {
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

class GitHubProvider extends GitProvider {
  constructor({ token, owner, repo }) {
    super();
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`github api ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getBranchSha(branch) {
    const data = await this.request(`/git/ref/heads/${encodeURIComponent(branch)}`);
    return data.object.sha;
  }

  async createBranch({ baseBranch, newBranch }) {
    const baseSha = await this.getBranchSha(baseBranch);
    await this.request("/git/refs", {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseSha
      })
    });
  }

  async upsertFile({ branch, path, content, message }) {
    let sha;
    try {
      const existing = await this.request(`/contents/${path}?ref=${encodeURIComponent(branch)}`);
      sha = existing.sha;
    } catch (_) {
      sha = undefined;
    }

    await this.request(`/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        branch,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha
      })
    });
  }

  async openPullRequest({ branch, baseBranch, title, body }) {
    const pr = await this.request("/pulls", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        head: branch,
        base: baseBranch
      })
    });

    return { url: pr.html_url };
  }

  async fileExists(path, ref) {
    try {
      await this.request(`/contents/${path}?ref=${encodeURIComponent(ref)}`);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getPullRequestStatus(prNumber) {
    const pr = await this.request(`/pulls/${prNumber}`);
    const checks = await this.request(`/commits/${pr.head.sha}/check-runs`);
    let checksState = "pending";

    const checkRuns = checks.check_runs || [];
    if (checkRuns.length > 0) {
      if (checkRuns.some((run) => run.status !== "completed")) {
        checksState = "pending";
      } else if (checkRuns.some((run) => run.conclusion !== "success")) {
        checksState = "failed";
      } else {
        checksState = "success";
      }
    }

    return {
      number: pr.number,
      state: pr.state,
      merged: Boolean(pr.merged_at),
      checksState,
      checks: checkRuns.map((run) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion || "pending"
      }))
    };
  }
}

class DryRunProvider extends GitProvider {
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
  if (mode === "github") {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    if (!token || !owner || !repo) {
      throw new Error("github mode requires GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME");
    }

    return new GitHubProvider({ token, owner, repo });
  }

  return new DryRunProvider();
}

export { createProviderFromEnv };
