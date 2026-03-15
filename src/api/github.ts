const GITHUB_API_URL = "https://api.github.com";

const getAuthHeaders = async () => {
  return new Promise<{ Authorization: string }>((resolve, reject) => {
    chrome.storage.local.get(["githubToken"], (result) => {
      if (result.githubToken) {
        resolve({ Authorization: `token ${result.githubToken}` });
      } else {
        reject("No GitHub token found.");
      }
    });
  });
};

export const fetchRepositories = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${GITHUB_API_URL}/user/repos`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }
  return response.json();
};

export const fetchPullRequests = async (owner: string, repo: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`,
    { headers },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json() as Promise<PullRequest[]>;
};

export const fetchCurrentUserLogin = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${GITHUB_API_URL}/user`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch current user");
  }
  const user = await response.json();
  return user.login as string;
};

export const fetchPullRequestBuildStatus = async (
  owner: string,
  repo: string,
  sha: string,
): Promise<"passed" | "failed" | "pending" | "unknown"> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${sha}/status`,
    { headers },
  );

  if (!response.ok) {
    return "unknown";
  }

  const status = (await response.json()) as { state?: string };
  if (status.state === "success") {
    return "passed";
  }

  if (status.state === "failure" || status.state === "error") {
    return "failed";
  }

  if (status.state === "pending") {
    return "pending";
  }

  return "unknown";
};
