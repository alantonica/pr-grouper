# Pull Request Grouper

[![Release on Merge to Main](https://github.com/alexantonica/pr-grouper/actions/workflows/release-on-merge-main.yml/badge.svg)](https://github.com/alexantonica/pr-grouper/actions/workflows/release-on-merge-main.yml)
[![Scheduled CI on Main](https://github.com/alexantonica/pr-grouper/actions/workflows/scheduled-ci-main.yml/badge.svg)](https://github.com/alexantonica/pr-grouper/actions/workflows/scheduled-ci-main.yml)

A Chrome extension to help you manage and open GitHub pull requests in grouped tabs.

## Features

- Authenticate with your GitHub account using a personal access token.
- Fetch a list of your repositories.
- Select repositories to view their open pull requests.
- Filter pull requests by title.
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

## Contributing

Contributions are welcome and appreciated! Here's how to get involved:

### Reporting bugs or requesting features

Use the GitHub Issues tab and select the appropriate template:

- **Bug Report** — describe the problem, steps to reproduce, and expected vs. actual behavior.
- **Feature Request** — describe the motivation and your proposed solution.

Blank issues are disabled, so please use a template to ensure all necessary context is provided.

### Submitting a pull request

1. [Fork the repository](https://github.com/alexantonica/pr-grouper/fork) and create a branch from `main`.
2. Make your changes, ensuring existing tests still pass (`npm test`).
3. If adding new behavior, include tests where appropriate.
4. Open a pull request against `main`. The PR template will guide you through the required information.

### Guidelines

- Keep pull requests focused — one feature or fix per PR.
- Write clear commit messages that describe the "why", not just the "what".
- Be respectful and constructive in all discussions — see our [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
