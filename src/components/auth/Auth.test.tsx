import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Auth from "./Auth";

const setupChromeStorageMocks = (accounts: GithubAccount[] = []) => {
  const get = vi.fn(
    (
      keys: string[] | string,
      callback: (items: { accounts?: GithubAccount[] }) => void,
    ) => {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      if (requestedKeys.includes("accounts")) {
        callback({ accounts });
        return;
      }

      callback({});
    },
  );

  const set = vi.fn(
    (_items: Record<string, unknown>, callback?: (() => void) | undefined) => {
      callback?.();
    },
  );

  Object.defineProperty(globalThis, "chrome", {
    value: {
      storage: {
        local: {
          get,
          set,
        },
      },
    },
    configurable: true,
    writable: true,
  });

  return { get, set };
};

describe("Auth component", () => {
  it("renders token creation instructions and link", () => {
    setupChromeStorageMocks();
    const onLoginSuccess = vi.fn();

    render(<Auth onLoginSuccess={onLoginSuccess} />);

    expect(
      screen.getByText("Add GitHub Account Access Token"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("How to create an access token"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "https://github.com/settings/personal-access-tokens/new",
      }),
    ).toHaveAttribute(
      "href",
      "https://github.com/settings/personal-access-tokens/new",
    );
  });

  it("hides Cancel when there are no existing accounts", () => {
    setupChromeStorageMocks([]);
    const onLoginSuccess = vi.fn();

    render(<Auth onLoginSuccess={onLoginSuccess} />);

    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  it("shows Cancel when accounts exist and calls onLoginSuccess on click", async () => {
    setupChromeStorageMocks([{ id: "a1", name: "Work", token: "t1" }]);
    const onLoginSuccess = vi.fn();

    render(<Auth onLoginSuccess={onLoginSuccess} />);

    const cancelButton = await screen.findByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not save when token name or token is empty", () => {
    const { set } = setupChromeStorageMocks();
    const onLoginSuccess = vi.fn();

    render(<Auth onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Account" }));

    expect(set).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("saves account data and calls onLoginSuccess", async () => {
    const existingAccounts: GithubAccount[] = [
      { id: "a1", name: "Existing", token: "existing-token" },
    ];
    const { set } = setupChromeStorageMocks(existingAccounts);
    const onLoginSuccess = vi.fn();

    render(<Auth onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(
      screen.getByPlaceholderText("Token Name (e.g. Work, Personal)"),
      {
        target: { value: "Personal" },
      },
    );
    fireEvent.change(screen.getByPlaceholderText("Enter your GitHub token"), {
      target: { value: "new-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Account" }));

    await waitFor(() => {
      expect(set).toHaveBeenCalledTimes(1);
    });

    const payload = set.mock.calls[0][0] as {
      accounts: GithubAccount[];
      githubToken: string;
      activeAccountId: string;
    };

    expect(payload.accounts).toHaveLength(2);
    expect(payload.accounts[1]).toMatchObject({
      name: "Personal",
      token: "new-token",
    });
    expect(payload.githubToken).toBe("new-token");
    expect(payload.activeAccountId).toBe(payload.accounts[1].id);
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });
});
