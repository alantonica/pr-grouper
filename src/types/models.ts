interface GithubAccount {
  id: string;
  name: string;
  token: string;
}

// Define the type for a repository
interface Repo {
  id: number;
  full_name: string;
  owner: {
    login: string;
  };
  name: string;
}

// Define the type for a pull request
interface PullRequest {
  id: number;
  title: string;
  html_url: string;
  created_at: string;
  labels: {
    id: number;
    name: string;
    color: string;
    description?: string | null;
  }[];
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
  build_status?: "passed" | "failed" | "pending" | "unknown";
  user: {
    login: string;
  };
  assignees: {
    login: string;
  }[];
}
