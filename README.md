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
