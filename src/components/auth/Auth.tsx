// src/components/Auth.tsx
import { useState, useEffect } from "react";

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth = ({ onLoginSuccess }: AuthProps) => {
  const [token, setToken] = useState("");
  const [tokenName, setTokenName] = useState("");
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
    if (!token.trim() || !tokenName.trim()) return;

    chrome.storage.local.get(["accounts"], (result) => {
      const accounts = (result.accounts || []) as GithubAccount[];
      const newAccount = {
        id: crypto.randomUUID(),
        name: tokenName,
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
        <h2 className="text-lg font-bold">Add GitHub Account Access Token</h2>
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

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
        <p className="font-semibold mb-1">How to create an access token</p>
        <p className="mb-2">
          Create one here:{" "}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            https://github.com/settings/personal-access-tokens/new
          </a>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select the proper resource owner.</li>
          <li>Mind the expiration date.</li>
          <li>Allow which repositories the token should give access to.</li>
          <li>Add Pull requests permission.</li>
          <li>Generate token</li>
          <li>Copy the generated token and paste it below</li>
        </ol>
      </div>

      <input
        type="text"
        value={tokenName}
        onChange={(e) => setTokenName(e.target.value)}
        placeholder="Token Name (e.g. Work, Personal)"
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
