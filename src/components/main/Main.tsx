import { useState, useEffect, useRef } from "react";
import {
  fetchRepositories,
  fetchPullRequests,
  fetchCurrentUserLogin,
  fetchPullRequestBuildStatus,
} from "../../api/github";

interface MainProps {
  onLogout: () => void;
  onAddAccount: () => void;
}

const Main = ({ onLogout, onAddAccount }: MainProps) => {
  const [accounts, setAccounts] = useState<GithubAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  const [currentUserLogin, setCurrentUserLogin] = useState<string>("");
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
  const [selectedPullRequests, setSelectedPullRequests] = useState<number[]>(
    [],
  );
  const [repoSearch, setRepoSearch] = useState("");
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pullRequestLoadRequestRef = useRef(0);

  const getRepoStorageKey = (repo: Repo, accountId: string) =>
    `${accountId || "default"}:${repo.owner.login}/${repo.name}`;

  const getStoredData = (keys: string[]): Promise<Record<string, unknown>> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result));
    });
  };

  const setStoredData = (items: Record<string, unknown>): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => resolve());
    });
  };

  const resolveActiveAccountId = async () => {
    if (activeAccountId) {
      return activeAccountId;
    }

    const result = (await getStoredData(["activeAccountId"])) as {
      activeAccountId?: string;
    };
    const resolvedAccountId = result.activeAccountId || "";
    if (resolvedAccountId) {
      setActiveAccountId(resolvedAccountId);
    }
    return resolvedAccountId;
  };

  const ensureCurrentUserLogin = async (accountId: string) => {
    if (currentUserLogin) {
      return currentUserLogin;
    }

    const accountKey = accountId || "default";

    const result = (await getStoredData(["githubUserLogins"])) as {
      githubUserLogins?: Record<string, string>;
    };
    const loginFromStorage = result.githubUserLogins?.[accountKey];
    if (loginFromStorage) {
      setCurrentUserLogin(loginFromStorage);
      return loginFromStorage;
    }

    try {
      const login = await fetchCurrentUserLogin();
      setCurrentUserLogin(login);
      const existingLogins = result.githubUserLogins || {};
      await setStoredData({
        githubUserLogins: {
          ...existingLogins,
          [accountKey]: login,
        },
      });
      return login;
    } catch {
      return "";
    }
  };

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
    const requestId = ++pullRequestLoadRequestRef.current;
    setErrorPullRequests(null);

    try {
      const targetRepo = repo || selectedRepo;
      if (targetRepo == null) {
        setPullRequests([]);
        setSelectedPullRequests([]);
        console.warn("No repository selected, skipping pull request fetch");
        return;
      }

      const resolvedAccountId = await resolveActiveAccountId();
      const repoStorageKey = getRepoStorageKey(targetRepo, resolvedAccountId);
      const storageResult = (await getStoredData([
        "pullRequestsByRepo",
        "selectedPullRequestsByRepo",
      ])) as {
        pullRequestsByRepo?: Record<string, PullRequest[]>;
        selectedPullRequestsByRepo?: Record<string, number[]>;
      };

      const cachedPullRequests =
        storageResult.pullRequestsByRepo?.[repoStorageKey] || [];
      const cachedSelectedPullRequests =
        storageResult.selectedPullRequestsByRepo?.[repoStorageKey] || [];

      if (cachedPullRequests.length > 0) {
        const validIds = new Set(cachedPullRequests.map((pr) => pr.id));
        setPullRequests(cachedPullRequests);
        setSelectedPullRequests(
          cachedSelectedPullRequests.filter((id) => validIds.has(id)),
        );
        setLoadingPullRequests(false);
      } else {
        setPullRequests([]);
        setSelectedPullRequests([]);
        setLoadingPullRequests(true);
      }

      const login = await ensureCurrentUserLogin(resolvedAccountId);

      const prs = await fetchPullRequests(
        targetRepo.owner.login,
        targetRepo.name,
      );

      const userPullRequests = login
        ? prs.filter(
            (pr: PullRequest) =>
              pr.user.login.toLowerCase() === login.toLowerCase(),
          )
        : prs;

      const userPullRequestsWithBuildStatus = await Promise.all(
        userPullRequests.map(async (pr) => {
          const buildStatus = await fetchPullRequestBuildStatus(
            targetRepo.owner.login,
            targetRepo.name,
            pr.head.sha,
          );

          return {
            ...pr,
            build_status: buildStatus,
          };
        }),
      );

      const latestResult = (await getStoredData([
        "pullRequestsByRepo",
        "selectedPullRequestsByRepo",
      ])) as {
        pullRequestsByRepo?: Record<string, PullRequest[]>;
        selectedPullRequestsByRepo?: Record<string, number[]>;
      };

      const nextPullRequestsByRepo = {
        ...(latestResult.pullRequestsByRepo || {}),
        [repoStorageKey]: userPullRequestsWithBuildStatus,
      };

      await setStoredData({ pullRequestsByRepo: nextPullRequestsByRepo });

      if (requestId !== pullRequestLoadRequestRef.current) {
        return;
      }

      const nextValidIds = new Set(
        userPullRequestsWithBuildStatus.map((pr) => pr.id),
      );
      const selectedForRepo =
        latestResult.selectedPullRequestsByRepo?.[repoStorageKey] || [];

      setPullRequests(userPullRequestsWithBuildStatus);
      setSelectedPullRequests(
        selectedForRepo.filter((id) => nextValidIds.has(id)),
      );
      setErrorPullRequests(null);
      setLoadingPullRequests(false);
      console.log("Fetched pull requests:", userPullRequestsWithBuildStatus);
    } catch (err) {
      setErrorPullRequests("Failed to fetch pull requests");
      if (requestId === pullRequestLoadRequestRef.current) {
        setLoadingPullRequests(false);
      }
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
    return titleMatch;
  });

  const getReadableLabelTextColor = (hexColor: string) => {
    const normalized = hexColor.replace("#", "");
    const safeHex =
      normalized.length === 3
        ? normalized
            .split("")
            .map((char) => `${char}${char}`)
            .join("")
        : normalized.padEnd(6, "0").slice(0, 6);

    const red = Number.parseInt(safeHex.slice(0, 2), 16) / 255;
    const green = Number.parseInt(safeHex.slice(2, 4), 16) / 255;
    const blue = Number.parseInt(safeHex.slice(4, 6), 16) / 255;

    const toLinear = (value: number) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

    const luminance =
      0.2126 * toLinear(red) +
      0.7152 * toLinear(green) +
      0.0722 * toLinear(blue);

    const whiteContrast = 1.05 / (luminance + 0.05);
    const darkContrast = (luminance + 0.05) / 0.05;

    return whiteContrast >= darkContrast ? "#ffffff" : "#111827";
  };

  const selectedFilteredPullRequestCount = selectedPullRequests.filter((id) =>
    filteredPullRequests.some((pr) => pr.id === id),
  ).length;

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
        setSelectedPullRequests([]);
      }
    }
  };

  const openSelectedPullRequests = async () => {
    try {
      const groupName = prompt("Enter a name for the tab group:");
      if (groupName) {
        // Open PRs in the exact order the user selected them
        const selectedPrs = selectedPullRequests
          .map((id) => filteredPullRequests.find((pr) => pr.id === id))
          .filter((pr): pr is PullRequest => pr !== undefined);
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
          setSelectedPullRequests([]);
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

  const handleSelect = async (repoId: number) => {
    await handleRepoSelection(repoId);
    setIsRepoOpen(false); // Close after selection
  };

  const handleDeleteToken = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this token?",
    );
    if (confirmed) {
      onLogout();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsRepoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const BuyMeACoffee = () => {
    const handleSupport = () => {
      chrome.tabs.create({ url: "https://www.buymeacoffee.com/alexantonica" });
    };

    return (
      <button
        onClick={handleSupport}
        className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
      >
        <span role="img" aria-label="coffee">
          ☕
        </span>
        <span>Buy me a coffee</span>
      </button>
    );
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

  useEffect(() => {
    if (!selectedRepo) {
      return;
    }

    const persistSelectedPullRequests = async () => {
      const resolvedAccountId = await resolveActiveAccountId();
      const repoStorageKey = getRepoStorageKey(selectedRepo, resolvedAccountId);

      chrome.storage.local.get(["selectedPullRequestsByRepo"], (result) => {
        const selectedByRepo = (result.selectedPullRequestsByRepo ||
          {}) as Record<string, number[]>;

        chrome.storage.local.set({
          selectedPullRequestsByRepo: {
            ...selectedByRepo,
            [repoStorageKey]: selectedPullRequests,
          },
        });
      });
    };

    void persistSelectedPullRequests();
  }, [selectedPullRequests, selectedRepo, activeAccountId]);

  return (
    <div className="flex flex-col h-full max-w-full overflow-x-hidden px-5">
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
            className="bg-green-200 hover:bg-gray-300 text-gray-700 text-xs py-1 px-2 rounded"
          >
            + Add Token
          </button>
          <button
            onClick={handleDeleteToken}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded-md transition-colors"
          >
            Delete Token
          </button>

          <BuyMeACoffee />
        </div>
      </div>

      <div className="mt-4 relative" ref={dropdownRef}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Repositories
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadRepositories}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
            >
              Refresh List
            </button>
          </div>
        </div>

        {/* Dropdown Toggle Button */}
        <button
          onClick={() => setIsRepoOpen(!isRepoOpen)}
          className={`w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm transition-all bg-white shadow-sm ${
            isRepoOpen
              ? "ring-2 ring-blue-500 border-transparent"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <span
            className={`truncate ${selectedRepo ? "text-gray-900 font-medium" : "text-gray-400"}`}
          >
            {selectedRepo ? selectedRepo.full_name : "Select a repository..."}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isRepoOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        {/* Dropdown Menu */}
        {isRepoOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col max-h-64">
            {/* Inline Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search repositories..."
                autoFocus
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto grow">
              {loading && (
                <p className="text-gray-400 italic text-xs p-4 text-center">
                  Loading...
                </p>
              )}

              {filteredRepos.length === 0 && !loading && (
                <p className="text-gray-400 text-xs p-4 text-center">
                  No matches found.
                </p>
              )}

              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleSelect(repo.id)}
                  className={`flex flex-col px-3 py-2 cursor-pointer transition-colors border-l-4 ${
                    selectedRepo?.id === repo.id
                      ? "bg-blue-50 border-blue-600"
                      : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <span
                    className={`text-sm truncate ${selectedRepo?.id === repo.id ? "font-bold text-blue-700" : "text-gray-700"}`}
                  >
                    {repo.full_name}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {repo.owner.login}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col grow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Pull Requests
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPullRequests()}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
            >
              Refresh List
            </button>

            <button
              onClick={openAllPullRequests}
              disabled={filteredPullRequests.length === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white text-xs font-bold py-1 px-2 rounded-md shadow-sm transition-colors"
            >
              Open All
            </button>
            <button
              onClick={openSelectedPullRequests}
              disabled={
                filteredPullRequests.length === 0 ||
                selectedFilteredPullRequestCount === 0
              }
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-xs font-bold py-1 px-2 rounded-md shadow-sm transition-colors"
            >
              Open Selected
            </button>
          </div>
        </div>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Title"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="border border-gray-200 rounded-lg p-3 h-72 overflow-y-auto bg-white shadow-inner">
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
          {filteredPullRequests.map((pr, index) => (
            <div
              key={pr.id}
              className={`flex items-center justify-between py-2 px-2 border-b border-gray-300 last:border-b-0 ${
                index % 2 === 1
                  ? "bg-gray-50 hover:bg-gray-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center overflow-hidden mr-2 w-full">
                <div className="w-4 h-4 shrink-0 mr-2 flex items-center justify-center">
                  {selectedPullRequests.includes(pr.id) ? (
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                      {selectedPullRequests.indexOf(pr.id) + 1}
                    </span>
                  ) : (
                    <span className="w-4 h-4" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 shrink-0"
                  checked={selectedPullRequests.includes(pr.id)}
                  onChange={() => handlePullRequestSelection(pr.id)}
                />
                <div className="ml-3 flex flex-col overflow-hidden w-full">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 truncate"
                      title={pr.title}
                    >
                      {pr.title}
                    </a>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${
                        pr.build_status === "passed"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : pr.build_status === "failed"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : pr.build_status === "pending"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      Build:{" "}
                      {pr.build_status === "passed"
                        ? "Passed"
                        : pr.build_status === "failed"
                          ? "Failed"
                          : pr.build_status === "pending"
                            ? "Pending"
                            : "Unknown"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(pr.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 w-fit">
                    <span className="font-medium text-gray-700 truncate max-w-22.5">
                      {pr.head.ref}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span className="font-medium text-gray-700 truncate max-w-22.5">
                      {pr.base.ref}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1 mt-1">
                    {[...(pr.labels || [])]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .slice(0, 3)
                      .map((label) => (
                        <span
                          key={label.id}
                          title={label.description || label.name}
                          className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                          style={{
                            backgroundColor: `#${label.color}`,
                            borderColor: `#${label.color}`,
                            color: getReadableLabelTextColor(label.color),
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    {(pr.labels?.length || 0) > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">
                        +{(pr.labels?.length || 0) - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => chrome.tabs.create({ url: pr.html_url })}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-2 rounded border border-gray-300 transition-colors shrink-0"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Main;
