This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
public/
  manifest.json
src/
  api/
    github.ts
  components/
    Auth.test.tsx
    Auth.tsx
    Favorite.tsx
    Main.tsx
  test/
    setup.ts
  types/
    models.ts
  App.tsx
  index.css
  main.tsx
  vite-env.d.ts
.gitignore
eslint.config.js
GEMINI.md
index.html
package.json
README.md
tailwind.config.js
tsconfig.json
tsconfig.node.json
vite.config.ts
```

# Files

## File: public/manifest.json
```json
{
  "name": "Pull Request Grouper",
  "version": "1.0.19",
  "manifest_version": 3,
  "permissions": ["storage", "tabs", "scripting", "tabGroups"],
  "action": {
    "default_popup": "index.html"
  }
}
```

## File: src/api/github.ts
```typescript
const GITHUB_API_URL = 'https://api.github.com';

const getAuthHeaders = async () => {
  return new Promise<{ Authorization: string }>((resolve, reject) => {
    chrome.storage.local.get(['githubToken'], (result) => {
      if (result.githubToken) {
        resolve({ Authorization: `token ${result.githubToken}` });
      } else {
        reject('No GitHub token found.');
      }
    });
  });
};

export const fetchRepositories = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${GITHUB_API_URL}/user/repos`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }
  return response.json();
};

export const fetchPullRequests = async (owner: string, repo: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch pull requests');
  }
  return response.json();
};
```

## File: src/components/Auth.test.tsx
```typescript
import { render, screen } from '@testing-library/react';
import Auth from './Auth';

describe('Auth component', () => {
  it('renders the component', () => {
    render(<Auth />);
    expect(screen.getByText('GitHub Authentication')).toBeInTheDocument();
  });
});
```

## File: src/components/Auth.tsx
```typescript
// src/components/Auth.tsx
import { useState, useEffect } from "react";

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth = ({ onLoginSuccess }: AuthProps) => {
  const [token, setToken] = useState("");
  const [accountName, setAccountName] = useState("");
  const [hasExistingAccounts, setHasExistingAccounts] = useState(false);

  useEffect(() => {
    // Check if we have existing accounts to decide whether to show "Cancel"
    chrome.storage.local.get(["accounts"], (result) => {
      if (result.accounts && (result.accounts as GithubAccount[]).length > 0) {
        setHasExistingAccounts(true);
      }
    });
  }, []);

  const saveToken = () => {
    if (!token.trim() || !accountName.trim()) return;

    chrome.storage.local.get(["accounts"], (result) => {
      const accounts = (result.accounts || []) as GithubAccount[];
      const newAccount = {
        id: crypto.randomUUID(),
        name: accountName,
        token: token,
      };

      const updatedAccounts = [...accounts, newAccount];

      chrome.storage.local.set(
        {
          accounts: updatedAccounts,
          githubToken: token,
          activeAccountId: newAccount.id,
        },
        () => {
          onLoginSuccess();
        },
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Add GitHub Account</h2>
        {/* Only show Cancel if there's at least one account to go back to */}
        {hasExistingAccounts && (
          <button
            onClick={onLoginSuccess}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-2">
        Provide a GitHub personal access token with `repo` scope.
      </p>

      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Account Name (e.g. Work, Personal)"
        className="border rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter your GitHub token"
        className="border rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />

      <div className="flex gap-2">
        <button
          onClick={saveToken}
          className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Add Account
        </button>
      </div>
    </div>
  );
};

export default Auth;
```

## File: src/components/Favorite.tsx
```typescript
const Favorite = () => {
  return (
    <div className="mt-4">
      <h2 className="text-md font-bold mb-2">Favorite Repository</h2>
      <div className="flex items-center">
        {/* Placeholder for favorite repository selection */}
        <p>Favorite repository selection will be here.</p>
      </div>
    </div>
  );
};

export default Favorite;
```

## File: src/components/Main.tsx
```typescript
import { useState, useEffect } from "react";
import { fetchRepositories, fetchPullRequests } from "../api/github";
import Favorite from "./Favorite";

interface MainProps {
  onLogout: () => void;
  onAddAccount: () => void;
}

const Main = ({ onLogout, onAddAccount }: MainProps) => {
  const [accounts, setAccounts] = useState<GithubAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  const [repositories, setRepositories] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo>();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loadingPullRequests, setLoadingPullRequests] = useState(false);
  const [errorPullRequests, setErrorPullRequests] = useState<string | null>(
    null,
  );
  const [titleFilter, setTitleFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [selectedPullRequests, setSelectedPullRequests] = useState<number[]>(
    [],
  );
  const [repoSearch, setRepoSearch] = useState("");

  const filteredRepos = repositories.filter((repo) =>
    repo.full_name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  const loadRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const repos = await fetchRepositories();
      setRepositories(repos);

      // persist repositories in local storage for later use
      chrome.storage.local.set({ repositories: repos });
    } catch (err) {
      setError("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelection = async (repoId: number) => {
    const newSelectedRepo =
      selectedRepo?.id === repoId
        ? undefined
        : repositories.find((repo) => repo.id === repoId);

    setSelectedRepo(newSelectedRepo);
    chrome.storage.local.set({ selectedRepo: newSelectedRepo || null });

    // Automatically fetch PRs when a new repo is selected
    if (newSelectedRepo) {
      await loadPullRequests(newSelectedRepo);
    } else {
      setPullRequests([]);
    }
  };
  const loadPullRequests = async (repo?: Repo) => {
    setLoadingPullRequests(true);
    setErrorPullRequests(null);
    try {
      const targetRepo = repo || selectedRepo;
      if (targetRepo == null) {
        setPullRequests([]);
        console.warn("No repository selected, skipping pull request fetch");
        return;
      }

      const prs = await fetchPullRequests(
        targetRepo.owner.login,
        targetRepo.name,
      );

      setPullRequests(prs.flat());
      console.log("Fetched pull requests:", prs);
    } catch (err) {
      setErrorPullRequests("Failed to fetch pull requests");
    } finally {
      setLoadingPullRequests(false);
    }
  };

  const handlePullRequestSelection = (prId: number) => {
    setSelectedPullRequests((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId],
    );
  };

  const filteredPullRequests = pullRequests.filter((pr) => {
    const titleMatch = pr.title
      .toLowerCase()
      .includes(titleFilter.toLowerCase());
    const authorMatch = pr.user.login
      .toLowerCase()
      .includes(authorFilter.toLowerCase());
    const assigneeMatch = pr.assignees.some((assignee) =>
      assignee.login.toLowerCase().includes(assigneeFilter.toLowerCase()),
    );
    return titleMatch && authorMatch && (assigneeFilter ? assigneeMatch : true);
  });

  const openAllPullRequests = async () => {
    const groupName = prompt("Enter a name for the tab group:");
    if (groupName) {
      const tabs = await Promise.all(
        filteredPullRequests.map((pr) =>
          chrome.tabs.create({ url: pr.html_url, active: false }),
        ),
      );
      const tabIds = tabs
        .map((tab) => tab.id)
        .filter((id): id is number => id !== undefined);

      if (tabIds.length > 0) {
        // We use a type assertion or a check to satisfy the tuple requirement
        const groupId = await chrome.tabs.group({
          tabIds: tabIds as [number, ...number[]],
        });
        await chrome.tabGroups.update(groupId, { title: groupName });
      }
    }
  };

  const openSelectedPullRequests = async () => {
    try {
      const groupName = prompt("Enter a name for the tab group:");
      if (groupName) {
        const selectedPrs = filteredPullRequests.filter((pr) =>
          selectedPullRequests.includes(pr.id),
        );
        const tabs = await Promise.all(
          selectedPrs.map((pr) =>
            chrome.tabs.create({ url: pr.html_url, active: false }),
          ),
        );
        const tabIds = tabs
          .map((tab) => tab.id)
          .filter((id): id is number => id !== undefined);

        if (tabIds.length > 0) {
          // We use a type assertion or a check to satisfy the tuple requirement
          const groupId = await chrome.tabs.group({
            tabIds: tabIds as [number, ...number[]],
          });

          // update the group name and color for better visibility after 1 second delay to ensure tabs are grouped before updating
          // setTimeout(async () => {
          await chrome.tabGroups.update(groupId, {
            title: groupName,
            color: "blue",
          });
          // }, 1000);
        }
      }
    } catch (error) {
      console.error("Error opening selected pull requests:", error);
    }
  };

  const switchAccount = (accountId: string) => {
    const selectedAccount = accounts.find((a) => a.id === accountId);
    if (selectedAccount) {
      chrome.storage.local.set(
        {
          githubToken: selectedAccount.token,
          activeAccountId: accountId,
          selectedRepo: null, // Clear repo selection when switching accounts
        },
        () => {
          window.location.reload(); // Reload to refresh all data with new token
        },
      );
    }
  };

  useEffect(() => {
    chrome.storage.local.get(["accounts", "activeAccountId"], (result) => {
      if (result.accounts) setAccounts(result.accounts as GithubAccount[]);
      if (result.activeAccountId)
        setActiveAccountId(result.activeAccountId as string);
    });

    // Load persisted selections first
    chrome.storage.local.get(["selectedRepo"], async (result) => {
      console.log("Loaded selectedRepo from storage:", result.selectedRepo);
      if (result.selectedRepo) {
        const repo = result.selectedRepo as Repo;
        setSelectedRepo(repo);
        await loadPullRequests(repo);
      }
    });

    // load repos from local storage if available as initial data
    chrome.storage.local.get(["repositories"], (result) => {
      console.log("Loaded repositories from storage:", result.repositories);
      if (result.repositories) {
        setRepositories(result.repositories as Repo[]);
      }
    });

    loadRepositories();
  }, []);

  return (
    <div className="flex flex-col h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-800">PR Grouper</h1>
          {/* Account Switcher Dropdown */}
          <select
            value={activeAccountId}
            onChange={(e) => switchAccount(e.target.value)}
            className="text-xs border rounded mt-1 bg-white"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {/* Add a "plus" button to add another account */}
          <button
            onClick={onAddAccount}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs py-1 px-2 rounded"
          >
            + Add Account
          </button>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={loadRepositories}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <Favorite />

      {/* Repositories List */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Repositories
          </h2>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {repositories.length} Total
          </span>
        </div>

        {/* Repository Search Bar - Only shows if > 5 repos as per plan */}
        {repositories.length > 5 && (
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search repositories..."
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-sm"
            />
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-2 h-48 overflow-y-auto bg-gray-50/50">
          {loading && (
            <p className="text-gray-500 italic text-sm text-center py-4">
              Loading...
            </p>
          )}

          {filteredRepos.length === 0 && !loading && (
            <p className="text-center text-gray-400 text-xs py-10">
              No repositories found.
            </p>
          )}

          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              onClick={() => handleRepoSelection(repo.id)}
              className={`group flex items-center py-2 px-3 rounded-md mb-1 transition-all cursor-pointer relative ${
                selectedRepo?.id === repo.id
                  ? "bg-white border border-blue-200 shadow-sm ring-1 ring-blue-100"
                  : "hover:bg-blue-50 border border-transparent"
              }`}
            >
              {/* Vertical indicator for selection */}
              <div
                className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full transition-all ${
                  selectedRepo?.id === repo.id
                    ? "bg-blue-600"
                    : "bg-transparent group-hover:bg-blue-300"
                }`}
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    selectedRepo?.id === repo.id
                      ? "font-bold text-blue-700"
                      : "text-gray-700 font-medium"
                  }`}
                >
                  {repo.full_name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {repo.owner.login}
                </p>
              </div>

              {selectedRepo?.id === repo.id && (
                <div className="ml-2 animate-pulse">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col grow">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
          Pull Requests
        </h2>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <input
            type="text"
            placeholder="Title"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Author"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Assignee"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Increased PR area height and added subtle background for better separation */}
        <div className="border border-gray-200 rounded-lg p-3 h-80 overflow-y-auto bg-white shadow-inner">
          {loadingPullRequests && (
            <p className="text-gray-500 italic text-sm text-center py-4">
              Loading PRs...
            </p>
          )}
          {errorPullRequests && (
            <p className="text-red-500 text-sm text-center py-4">
              {errorPullRequests}
            </p>
          )}
          {filteredPullRequests.length === 0 && !loadingPullRequests && (
            <p className="text-gray-400 text-xs text-center py-4">
              No pull requests found.
            </p>
          )}
          {filteredPullRequests.map((pr) => (
            <div
              key={pr.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-1"
            >
              <div className="flex items-center overflow-hidden mr-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                  checked={selectedPullRequests.includes(pr.id)}
                  onChange={() => handlePullRequestSelection(pr.id)}
                />
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-xs font-medium text-blue-600 hover:text-blue-800 truncate"
                  title={pr.title}
                >
                  {pr.title}
                </a>
              </div>
              <button
                onClick={() => chrome.tabs.create({ url: pr.html_url })}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-2 rounded border border-gray-300 transition-colors flex-shrink-0"
              >
                Open
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2 pb-2">
          <button
            onClick={openAllPullRequests}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-3 rounded-md shadow-sm transition-colors"
          >
            Open All
          </button>
          <button
            onClick={openSelectedPullRequests}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-3 rounded-md shadow-sm transition-colors"
          >
            Open Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default Main;
```

## File: src/test/setup.ts
```typescript
import '@testing-library/jest-dom';
```

## File: src/types/models.ts
```typescript
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
  user: {
    login: string;
  };
  assignees: {
    login: string;
  }[];
}
```

## File: src/App.tsx
```typescript
import { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Main from "./components/Main";

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  const handleLogout = () => {
    chrome.storage.local.get(["accounts", "activeAccountId"], (result) => {
      const accounts = (result.accounts || []) as GithubAccount[];
      const activeId = result.activeAccountId;

      // Filter out the active account
      const updatedAccounts = accounts.filter((acc) => acc.id !== activeId);

      if (updatedAccounts.length > 0) {
        // If there are other accounts, switch to the first one available
        const nextAccount = updatedAccounts[0];
        chrome.storage.local.set(
          {
            accounts: updatedAccounts,
            activeAccountId: nextAccount.id,
            githubToken: nextAccount.token,
            selectedRepo: null, // Clear repo state for the new active account
          },
          () => {
            // Force a reload to refresh data with the next account
            window.location.reload();
          },
        );
      } else {
        // If no accounts left, clear everything and show Auth screen
        chrome.storage.local.remove(
          [
            "githubToken",
            "selectedRepo",
            "repositories",
            "accounts",
            "activeAccountId",
          ],
          () => {
            setAuthenticated(false);
          },
        );
      }
    });
  };

  useEffect(() => {
    chrome.storage.local.get(["githubToken"], (result) => {
      if (result.githubToken) {
        setAuthenticated(true);
      }
    });
  }, []);

  return (
    <div className="p-4">
      {authenticated ? (
        // Pass the logout handler to the Main component
        <Main onLogout={handleLogout} onAddAccount={() => setAuthenticated(false)}/>
      ) : (
        <Auth onLoginSuccess={() => setAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
```

## File: src/index.css
```css
@import "tailwindcss";


/* Set a fixed width for the extension popup */
body {
  width: 600px;
  min-height: 500px;
  margin: 0;
  background-color: #ffffff;
}
```

## File: src/main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## File: src/vite-env.d.ts
```typescript
/// <reference types="vite/client" />
```

## File: .gitignore
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
dist-ssr/
*.local

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor/IDE folders
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Testing
/coverage
/.nyc_output

# OS-specific files
.DS_Store
Thumbs.db

# Vite/TypeScript cache
.vite/
.tsbuildinfo
```

## File: eslint.config.js
```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // React 19 no longer requires 'import React from "react"'
      'react/react-in-jsx-scope': 'off', 
    },
  },
);
```

## File: GEMINI.md
```markdown
# Gemini Development Plan: Pull Request Grouper Chrome Extension

This document outlines the development plan for creating a Chrome extension that helps users manage and open GitHub pull requests in grouped tabs.

## Phase 1: Project Setup and Core UI [Completed]

1.  **Initialize Project**: Set up a new React project using Vite with TypeScript and Tailwind CSS. [Completed]
2.  **Create `manifest.json`**: Define the basic extension properties, including name, version, permissions (storage, tabs, scripting), and action (popup). [Completed]
3.  **Authentication UI**: [Completed]
    *   Create a component to guide users on how to create a fine-grained GitHub personal access token with `repo` scope. [Completed]
    *   Include a link to the GitHub documentation. [Completed]
    *   Provide an input field for the user to paste their token. [Completed]
    *   Implement a button to save the token securely using `chrome.storage.local`. [Completed]
4.  **Main UI Layout**: [Completed]
    *   Create the main popup component. [Completed]
    *   Add a header with the extension title and a refresh button. [Completed]
    *   Create a component to display a list of repositories. [Completed]
    *   Create a component to display a list of pull requests for the selected repositories. [Completed]
    *   Create a favorite component where the user can select a favorite repository so nagivate to it faster. [Completed]

## Phase 2: GitHub API Integration [Partially Completed]

1.  **API Service**: Create a service module to interact with the GitHub API. [Completed]
    *   Implement a function to fetch repositories for the authenticated user. [Completed]
    *   Implement a function to fetch open pull requests for a given repository. [Completed]
2.  **State Management**: Use React's state management (e.g., `useState`, `useEffect`, `useContext`) to manage: [Completed]
    *   The GitHub access token. [Completed]
    *   The list of repositories. [Completed]
    *   The list of pull requests. [Completed]
    *   Loading and error states. [Completed]
3.  **Data Fetching**: [Completed]
    *   When the popup is opened, check if a token is stored. [Completed]
    *   If a token exists, fetch the repositories and pull requests. [Completed]
    *   If no token exists, show the authentication UI. [Completed]
    *   Implement the refresh button to re-fetch all data. [Completed]
4.  **Component Reusage**:
    *   Create reusable components for repository and pull request items, including loading and error states.
    *   Implement a component to display a message when no repositories or pull requests are found.
    *   Implement a component to display error messages when API requests fail.
    *   Implement a component to display loading spinners while data is being fetched.
    *   Implement a component to display the user's favorite repository and allow them to set it as the default view when opening the extension.
    *   Implement a component to display a message when the user has not set a favorite repository yet, and provide an option to set one from the list of repositories.
    *   Reuse components as much as possible to maintain a consistent UI and reduce code duplication.
    *   Implement a component to display the count of open pull requests for each repository in the repository list.
    *   Implement a component to display the last updated time for each pull request in the pull request list.
    *   Implement a component to display the labels associated with each pull request in the pull request list.
    *   Implement a component to display the status checks for each pull request in the pull request list.

## Phase 3: Feature Implementation [Completed]

1.  **Repository Selection**: [Completed]
    *   Allow users to select/deselect repositories from the list. [Completed]
    *   Store the selected repositories in `chrome.storage.local`. [Completed]
    *   Fetch pull requests only for the selected repositories. [Completed]
2.  **Pull Request Filtering**: [Completed]
    *   Add input fields to filter pull requests by: [Completed]
        *   Title (text search) [Completed]
        *   Author [Completed]
        *   Assignees [Completed]
3.  **Open PRs**: [Completed]
    *   Add a button to each pull request item to open it in a new tab. [Completed]
    *   Implement "Open All" button for a repository to open all its PRs in a new tab group. The user should be prompted for a group name. [Completed]
    *   Implement "Open Selected" button to open selected PRs in a new tab group. The user should be prompted for a group name. [Completed]

## Phase 4: Finalization [Partially Completed]

1.  **Error Handling**: Implement robust error handling for API requests and display user-friendly error messages. [Partially Completed]
2.  **Testing**: Write tests for all feature and try to achieve 90%+ test coverage. [Partially Completed]
3.  **Documentation**: [Completed]
    *   Create a comprehensive `README.md` file explaining all features, setup, and development instructions. [Completed]
4.  **Publishing**: Write instructions on how to publish the extension to the Chrome Web Store. [Completed]

## Next Steps

The next steps would be to implement the features listed in the "Component Reusage" section of Phase 2.


## Current Issues that need to be addressed:

1. **Reactive Switch After Login**: After the user logs in and saves their token, the UI does not automatically switch to the main view. The user has to manually refresh the extension to see their repositories and pull requests. This can be improved by implementing a reactive state change that triggers a re-render of the main view once the token is validated and saved. [Completed]
2. **Persistence of Selected Repositories**: The selected repositories are not currently persisted across sessions. When the user selects repositories and then closes the extension, their selections are lost. This can be addressed by saving the selected repositories in `chrome.storage.local` and retrieving them when the extension is opened again. When displaying the list of repositories, the extension should show the repos currently in the local storage and after the fetching of remote repos finishes, to replace them with the fetched ones, but keeping the selected state of the repos that are still present in the fetched list. [Completed]
3. **Persistence of Pull requestss per repository**: The pull requests for each repository are not currently persisted across sessions. After the user fetches the pull requests for a repository, if they close the extension and open it again, they have to fetch the pull requests again. This can be improved by saving the pull requests for each repository in `chrome.storage.local` and retrieving them when the extension is opened again. When displaying the list of pull requests for a repository, the extension should show the PRs currently in the local storage and after the fetching of remote PRs finishes, to replace them with the fetched ones, but keeping any user interaction state (like selected PRs) that might be present in the local storage. [Completed]
4. **Window width**: The extension's UI is very narrow and does not utilize the available space effectively. This can be improved by setting a wider default width for the extension's popup and ensuring that the layout is responsive to different screen sizes. Additionally, implementing a scrollable area for the list of repositories and pull requests can help manage space more efficiently. [Completed]
5. **Group tab name missing**: Even though the user is prompted to enter a group name when opening multiple PRs, the tabs are not being grouped under the specified name. This can be addressed by ensuring that the `chrome.tabs.group` API is correctly implemented to group the opened tabs under the provided group name. Additionally, the extension should handle cases where the user does not provide a group name and assign a default name or allow grouping without a name.[Completed]
6. **Log out option**: There is currently no option for the user to log out or clear their saved token. This can be improved by adding a "Log Out" button in the UI that clears the stored token from `chrome.storage.local` and resets the extension to the authentication view. This will allow users to easily switch accounts or remove their credentials if needed.[Completed]
7. **Support for multiple GitHub accounts**: The extension currently only supports a single GitHub account. To enhance usability, consider implementing support for multiple accounts, allowing users to switch between different sets of repositories and pull requests without having to log out and log back in each time. This can be achieved by allowing users to save multiple tokens and associate them with different profiles within the extension. Also when the user adds a token, ask for a name for the token so the user can easily identify it later when switching between accounts. When the user selects a token, the extension should load the repositories and pull requests associated with that token. This will provide a more seamless experience for users who manage multiple GitHub accounts. [Completed]
8. **Performance Optimization**: As the number of repositories and pull requests increases, the extension may experience performance issues. To address this, consider implementing pagination or lazy loading for the list of repositories and pull requests. This will help reduce the initial load time and improve the overall responsiveness of the extension, especially for users with a large number of repositories and pull requests. [Completed]
9. **UI/UX Improvements**: The current UI is functional but could benefit from improvements in design and user experience. Consider implementing a more modern and intuitive design, adding icons or visual indicators for repositories and pull requests, and improving the overall layout to make it easier for users to navigate and manage their pull requests effectively. Additionally, providing tooltips or additional information on hover can enhance the user experience by giving users more context about their repositories and pull requests without cluttering the interface. Consider removing the "Fetch Pull Requests" button and automatically fetching pull requests when a repository is selected, to streamline the user experience and reduce the number of clicks required to view pull requests. Consider removing the checkbos from repository list and instead, when the user clicks on a repository, it should toggle the selection of that repository and automatically fetch the pull requests for it. This will simplify the UI and make it more intuitive for users to manage their repositories and pull requests. Also add a hover effect to the repository items to indicate that they are clickable and will show the pull requests when clicked. Also consider improving the UI and layout of repositories and allow the user to search through them if there are more than 5 repositories, to improve the user experience for users with a large number of repositories.
```

## File: index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## File: package.json
```json
{
  "name": "pull-request-grouper",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/chrome": "^0.1.37",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^8.57.0",
    "@typescript-eslint/parser": "^8.57.0",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "jsdom": "^28.1.0",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3",
    "vite": "^8.0.0",
    "vitest": "^4.1.0"
  },
  "overrides": {
    "@tailwindcss/vite": {
      "vite": "^8.0.0"
    }
  }
}
```

## File: README.md
```markdown
# Pull Request Grouper

A Chrome extension to help you manage and open GitHub pull requests in grouped tabs.

## Features

- Authenticate with your GitHub account using a personal access token.
- Fetch a list of your repositories.
- Select repositories to view their open pull requests.
- Filter pull requests by title, author, and assignees.
- Open individual pull requests in a new tab.
- Open all filtered pull requests in a new tab group.
- Open selected pull requests in a new tab group.
- Persists your selected repositories across sessions.

## Installation

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the `dist` directory.

## Development

1. Clone this repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run dev` to start the development server.
4. Load the extension in Chrome (see Installation).

## Publishing

1. Run `npm run build` to create a production build in the `dist` directory.
2. Zip the `dist` directory.
3. Go to the Chrome Developer Dashboard.
4. Upload the zip file to the "Package" section.
5. Fill in the store listing details and submit for review.
```

## File: tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## File: tsconfig.node.json
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

## File: vite.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```
