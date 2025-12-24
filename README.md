
# GraphIt

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Runs locally](https://img.shields.io/badge/data-local--only-informational)](#)
[![Serverless](https://img.shields.io/badge/runtime-serverless-informational)](#)
[![Built with Next.js](https://img.shields.io/badge/framework-Next.js-informational)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-informational)](https://www.typescriptlang.org)

GraphIt is a serverless, local-first GraphQL client that runs entirely in your browser. Workspaces, collections, history, and settings are stored locally on your device (IndexedDB/localStorage). There is no cloud sync and no account system.

---

## Contents

* [Features](#features)
* [Architecture](#architecture)
* [Getting started](#getting-started)
* [Build and run](#build-and-run)
* [Deployment](#docker-recommended)
* [CORS and subscriptions limitations](#cors-and-subscriptions-limitations)
* [Keyboard shortcuts](#keyboard-shortcuts)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)

## Screenshots

![GraphIt main interface](https://github.com/user-attachments/assets/d30b21d5-f2fd-4beb-9c50-3d30ed37aaa7)

![GraphIt docs explorer](https://github.com/user-attachments/assets/20698c65-df8d-46b1-ace1-4e83d86a0eb7)

---

## Features

### Core functionality

* Multiple workspaces for organizing GraphQL projects
* Tabbed interface for working on multiple operations simultaneously
* Named environments (local/staging/prod) with secret support
* Variable interpolation using `{{VAR_NAME}}` across endpoints, headers, variables, and scripts

### Query editor

* Monaco Editor with syntax highlighting, autocomplete, and schema validation
* Multiple operations per document with operation selection at run time
* Prettify and minify utilities

### Schema and documentation

* Schema introspection with caching per endpoint/environment
* Docs explorer for queries, mutations, subscriptions, types, and fields
* Advanced docs search with fast navigation
* Query generation from schema with configurable depth limits
* Checkbox query builder for field/argument/variable selection

### Requests

* HTTP methods: GET, POST, PUT, PATCH, DELETE
* Headers and authorization: Bearer, Basic, API Key
* File uploads using the GraphQL multipart request specification
* Optional Proxy Mode via a stateless serverless forwarder for CORS-restricted endpoints

### Subscriptions

* WebSocket support (graphql-ws)
* Server-Sent Events support (graphql-sse)
* Live stream viewer with pause/resume and export

### Scripts

* Pre-request scripts to compute variables/headers before execution
* Post-request scripts to process responses and set session values
* Sandboxed execution in a Web Worker with timeouts and restricted APIs

### Collections and history

* Collections for saving and organizing operations
* Import/export as JSON with merge options
* History of executed operations with one-click restore

### Settings

* Themes: light, dark, system
* Languages: English and Spanish (i18n)
* Editor options: font size, tab size, minimap

---

## Architecture

GraphIt runs as a browser UI. Optional serverless routes can be used for HTTP forwarding and introspection when CORS blocks direct browser access.

* UI (static): browser
* Optional HTTP forwarder: `/api/proxy` (stateless)
* Optional introspection forwarder: `/api/introspect` (stateless)
* Subscriptions: browser connects directly to target endpoint (WS/SSE)

---

## Getting started

### Prerequisites

* Node.js 18+ (Node.js 20+ recommended)
* npm or yarn

### Install

```bash
git clone <repository-url>
cd graphit
npm install
```

### Run in development

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Build and run

```bash
npm run build
npm start
```

---

## Docker (Recommended)

```bash
docker compose up -d
```

Or build and run manually:

```bash
docker build -t graphit .
docker run -p 3000:3000 graphit
```

---

## CORS and subscriptions limitations

### CORS

If your GraphQL endpoint does not allow browser requests due to CORS:

1. Enable Proxy Mode in GraphIt
2. GraphIt forwards HTTP requests through `/api/proxy` (stateless serverless route)
3. Adjust your GraphQL server CORS policy as needed

### WebSocket subscriptions

* WebSocket subscriptions connect directly from the browser to the target endpoint.
* GraphIt does not provide a WebSocket proxy.
* The subscription server must accept WebSocket connections from your browser origin.

If your environment blocks WebSockets, prefer SSE subscriptions where supported by your server.

---

## Keyboard shortcuts

| Action        | Shortcut               |
| ------------- | ---------------------- |
| Run operation | `Ctrl/Cmd + Enter`     |
| Prettify      | `Ctrl/Cmd + Shift + P` |
| Search docs   | `Ctrl/Cmd + K`         |

---

## Troubleshooting

### Schema introspection fails

* Verify the endpoint URL is correct and reachable.
* If CORS prevents schema loading, enable Proxy Mode and retry.
* Confirm the server allows introspection in the current environment.

### Subscriptions do not connect

* Confirm the subscription URL uses the correct protocol (`ws://`, `wss://`, or SSE endpoint).
* Verify the server accepts browser origins.
* Try SSE subscriptions if WebSockets are blocked in your environment.

### Lost workspaces/collections

GraphIt stores data in browser storage. Clearing site data, using private browsing, or aggressive browser storage policies can remove local data.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests where applicable
5. Submit a pull request

---

## License

MIT. See `LICENSE` for details.

