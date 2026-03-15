import { useState, useEffect } from "react";
import Auth from "./components/auth/Auth";
import Main from "./components/main/Main";

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
    <div className="p-6">
      {authenticated ? (
        // Pass the logout handler to the Main component
        <Main
          onLogout={handleLogout}
          onAddAccount={() => setAuthenticated(false)}
        />
      ) : (
        <Auth onLoginSuccess={() => setAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
