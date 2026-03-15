# Pull Request Grouper — Gemini Notes

This document reflects the current state of the Chrome extension implementation.

## What the extension does

- Supports multiple GitHub accounts (named tokens) and account switching.
- Loads repositories for the active account and lets the user select one repository from a searchable dropdown.
- Loads pull requests for the selected repository.
- Shows cached pull requests immediately from local storage, then refreshes from GitHub in the background.
- Filters pull requests to those created by the authenticated user.
- Allows selecting PRs and opening:
  - all visible PRs in a tab group (`Open All`)
  - selected PRs in selection order (`Open Selected`)
- Shows rich PR metadata in list rows:
  - title
  - opened date
  - source and target branches
  - labels (max 3 + `+N`)
  - build status (`Passed`, `Failed`, `Pending`, `Unknown`)

## Authentication / Token guidance

Auth UI includes explicit instructions for creating a fine-grained PAT at:

- https://github.com/settings/personal-access-tokens/new

User guidance includes:

1. Select the proper resource owner
2. Mind expiration date
3. Choose repositories scope
4. Add `Pull requests` permission

## Storage model (chrome.storage.local)

Primary keys currently used:

- `accounts`: saved token profiles
- `activeAccountId`: current profile id
- `githubToken`: active token
- `repositories`: cached repository list
- `selectedRepo`: currently selected repo
- `githubUserLogins`: map accountId -> login
- `pullRequestsByRepo`: map `${accountId}:${owner}/${repo}` -> `PullRequest[]`
- `selectedPullRequestsByRepo`: map `${accountId}:${owner}/${repo}` -> `number[]`

## Pull request behavior details

- On repo selection:
  - load cached PRs first (if present)
  - keep selected PR ids that still exist
  - fetch remote PRs in background
  - replace cache + UI with remote data
- Selection state persists per repo/account and is restored when reopening popup.
- After `Open All` or `Open Selected`, PR checkboxes are cleared.
- `Open All` is disabled when no PRs are visible.
- `Open Selected` is disabled when no PRs are visible or no visible PRs are selected.

## UI notes

- PR rows use alternating background for easier scanning.
- Row borders are intentionally stronger for clearer separation.
- Label chips use GitHub label color and auto-contrast text for readability.
- Label tooltip shows description when available.
- Build status is shown on the same row as PR title.
- Delete token action requires confirmation.

## API integration

Implemented in [src/api/github.ts](src/api/github.ts):

- `fetchRepositories()`
- `fetchPullRequests(owner, repo)`
- `fetchCurrentUserLogin()`
- `fetchPullRequestBuildStatus(owner, repo, sha)`

## Tests

Current tests are in:

- [src/components/auth/Auth.test.tsx](src/components/auth/Auth.test.tsx)
- [src/components/main/Main.test.tsx](src/components/main/Main.test.tsx)

Covered areas include:

- Auth rendering and token save/cancel flows
- Main disabled-action behavior
- PR metadata rendering
- Selected-open ordering behavior
- Delete-token confirmation behavior

Run commands:

- `npm test`
- `npm run build`

## Suggested next improvements

- Add tests for cache-first + background-refresh timing behavior.
- Add tests for label contrast utility and overflow edge cases.
- Consider optional pagination for very large PR lists.
