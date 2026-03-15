import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Main from "./Main";
import {
  fetchCurrentUserLogin,
  fetchPullRequestBuildStatus,
  fetchPullRequests,
  fetchRepositories,
} from "../../api/github";

vi.mock("../../api/github", () => ({
  fetchRepositories: vi.fn(),
  fetchPullRequests: vi.fn(),
  fetchCurrentUserLogin: vi.fn(),
  fetchPullRequestBuildStatus: vi.fn(),
}));

const mockedFetchRepositories = vi.mocked(fetchRepositories);
const mockedFetchPullRequests = vi.mocked(fetchPullRequests);
const mockedFetchCurrentUserLogin = vi.mocked(fetchCurrentUserLogin);
const mockedFetchPullRequestBuildStatus = vi.mocked(
  fetchPullRequestBuildStatus,
);

type StorageShape = Record<string, unknown>;

const setupChromeMocks = (initialStorage: StorageShape = {}) => {
  const storageData: StorageShape = { ...initialStorage };

  const get = vi.fn(
    (keys: string[] | string, callback: (data: StorageShape) => void) => {
      if (Array.isArray(keys)) {
        const result: StorageShape = {};
        keys.forEach((key) => {
          result[key] = storageData[key];
        });
        callback(result);
        return;
      }

      callback({ [keys]: storageData[keys] });
    },
  );

  const set = vi.fn((items: StorageShape, callback?: () => void) => {
    Object.assign(storageData, items);
    callback?.();
  });

  const createTab = vi.fn(async ({ url }: { url: string }) => ({
    id: Math.floor(Math.random() * 10000) + 1,
    url,
  }));
  const groupTabs = vi.fn(async () => 321);
  const updateGroup = vi.fn(async () => undefined);

  Object.defineProperty(globalThis, "chrome", {
    value: {
      storage: {
        local: {
          get,
          set,
        },
      },
      tabs: {
        create: createTab,
        group: groupTabs,
      },
      tabGroups: {
        update: updateGroup,
      },
    },
    writable: true,
    configurable: true,
  });

  return {
    get,
    set,
    createTab,
    groupTabs,
    updateGroup,
    storageData,
  };
};

const baseRepo: Repo = {
  id: 1,
  full_name: "owner/repo",
  owner: { login: "owner" },
  name: "repo",
};

const makePr = (
  id: number,
  title: string,
  url: string,
  extra: Partial<PullRequest> = {},
): PullRequest => ({
  id,
  title,
  html_url: url,
  created_at: "2026-03-14T10:00:00Z",
  labels: [],
  head: { sha: `sha-${id}`, ref: `feature/${id}` },
  base: { ref: "main" },
  build_status: "pending",
  user: { login: "alex" },
  assignees: [],
  ...extra,
});

describe("Main component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchRepositories.mockResolvedValue([baseRepo]);
    mockedFetchCurrentUserLogin.mockResolvedValue("alex");
    mockedFetchPullRequests.mockResolvedValue([]);
    mockedFetchPullRequestBuildStatus.mockResolvedValue("pending");
    vi.spyOn(window, "prompt").mockReturnValue("My Group");
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables open actions when no pull requests are available", async () => {
    setupChromeMocks({
      accounts: [{ id: "acc1", name: "Work", token: "token" }],
      activeAccountId: "acc1",
      repositories: [baseRepo],
    });

    render(<Main onLogout={vi.fn()} onAddAccount={vi.fn()} />);

    expect(await screen.findByText("PR Grouper")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open All" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Open Selected" }),
      ).toBeDisabled();
    });
  });

  it("renders PR metadata including branches, labels and build status", async () => {
    const repoStorageKey = "acc1:owner/repo";
    const labels = [
      { id: 1, name: "bug", color: "d73a4a", description: "Bug label" },
      {
        id: 2,
        name: "enhancement",
        color: "a2eeef",
        description: "Enhancement",
      },
      { id: 3, name: "docs", color: "0075ca", description: "Docs" },
      {
        id: 4,
        name: "needs-review",
        color: "5319e7",
        description: "Needs review",
      },
    ];

    const cachedPr = makePr(11, "Update README", "https://example.com/pr/11", {
      labels,
      build_status: "passed",
      head: { sha: "sha-11", ref: "feature/readme" },
      base: { ref: "main" },
    });

    setupChromeMocks({
      accounts: [{ id: "acc1", name: "Work", token: "token" }],
      activeAccountId: "acc1",
      selectedRepo: baseRepo,
      repositories: [baseRepo],
      pullRequestsByRepo: { [repoStorageKey]: [cachedPr] },
      selectedPullRequestsByRepo: { [repoStorageKey]: [] },
    });

    mockedFetchPullRequests.mockResolvedValue([cachedPr]);
    mockedFetchPullRequestBuildStatus.mockResolvedValue("passed");

    render(<Main onLogout={vi.fn()} onAddAccount={vi.fn()} />);

    expect(await screen.findByText("Update README")).toBeInTheDocument();
    expect(screen.getByText("feature/readme")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("Build: Passed")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
    expect(screen.getByText("enhancement")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("opens selected pull requests in selection order and clears selection", async () => {
    const repoStorageKey = "acc1:owner/repo";
    const pr1 = makePr(21, "First PR", "https://example.com/pr/21");
    const pr2 = makePr(22, "Second PR", "https://example.com/pr/22");

    const { createTab } = setupChromeMocks({
      accounts: [{ id: "acc1", name: "Work", token: "token" }],
      activeAccountId: "acc1",
      selectedRepo: baseRepo,
      repositories: [baseRepo],
      pullRequestsByRepo: { [repoStorageKey]: [pr1, pr2] },
      selectedPullRequestsByRepo: { [repoStorageKey]: [] },
    });

    mockedFetchPullRequests.mockResolvedValue([pr1, pr2]);

    render(<Main onLogout={vi.fn()} onAddAccount={vi.fn()} />);

    expect(await screen.findByText("First PR")).toBeInTheDocument();
    expect(screen.getByText("Second PR")).toBeInTheDocument();

    const allCheckboxes = screen.getAllByRole("checkbox");
    const firstPrCheckbox = allCheckboxes[0];
    const secondPrCheckbox = allCheckboxes[1];

    fireEvent.click(secondPrCheckbox);
    fireEvent.click(firstPrCheckbox);

    const openSelectedButton = screen.getByRole("button", {
      name: "Open Selected",
    });
    expect(openSelectedButton).toBeEnabled();

    fireEvent.click(openSelectedButton);

    await waitFor(() => {
      expect(createTab).toHaveBeenCalledTimes(2);
    });

    expect(createTab.mock.calls[0][0]).toMatchObject({
      url: "https://example.com/pr/22",
    });
    expect(createTab.mock.calls[1][0]).toMatchObject({
      url: "https://example.com/pr/21",
    });

    await waitFor(() => {
      expect(allCheckboxes[0]).not.toBeChecked();
      expect(allCheckboxes[1]).not.toBeChecked();
    });
  });

  it("calls onLogout when delete token is confirmed", async () => {
    setupChromeMocks({
      accounts: [{ id: "acc1", name: "Work", token: "token" }],
      activeAccountId: "acc1",
      repositories: [baseRepo],
    });

    const onLogout = vi.fn();
    render(<Main onLogout={onLogout} onAddAccount={vi.fn()} />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Token",
    });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this token?",
    );
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("does not call onLogout when delete token is cancelled", async () => {
    setupChromeMocks({
      accounts: [{ id: "acc1", name: "Work", token: "token" }],
      activeAccountId: "acc1",
      repositories: [baseRepo],
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const onLogout = vi.fn();
    render(<Main onLogout={onLogout} onAddAccount={vi.fn()} />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Token",
    });
    fireEvent.click(deleteButton);

    expect(onLogout).not.toHaveBeenCalled();
  });
});
