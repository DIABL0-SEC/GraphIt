# GraphIt

A serverless GraphQL client. GraphIt runs entirely in your browser.

## Features

### Core Functionality
- **Multiple Workspaces** - Organize your GraphQL projects
- **Tabbed Interface** - Work with multiple queries simultaneously
- **Environment Variables** - Named environments (local/staging/prod) with secret support
- **Variable Interpolation** - Use `{{VAR_NAME}}` syntax everywhere

### Query Editor
- **Monaco Editor** - Syntax highlighting, autocomplete, and validation
- **GraphQL Support** - Full GraphQL language support
- **Prettify/Minify** - Format your queries with one click
- **Multiple Operations** - Select which operation to run

### Schema & Documentation
- **Schema Introspection** - Load and cache schemas per endpoint
- **Docs Explorer** - Browse types, queries, mutations, subscriptions
- **Query Builder** - Visual query construction with checkboxes
- **Query Generation** - Generate queries from schema

### Request Features
- **HTTP Methods** - GET, POST, PUT, PATCH, DELETE support
- **Headers & Auth** - Bearer, Basic, API Key authentication
- **File Uploads** - GraphQL multipart request spec support
- **Proxy Mode** - Optional serverless proxy for CORS issues

### Subscriptions
- **WebSocket** - graphql-ws protocol support
- **Server-Sent Events** - graphql-sse support
- **Live Viewer** - Real-time message stream with pause/resume

### Scripts
- **Pre-request Scripts** - Modify variables, headers before sending
- **Post-request Scripts** - Process responses, set session variables
- **Sandboxed Execution** - Secure Web Worker isolation with timeout

### Collections & History
- **Collections** - Save and organize queries
- **Import/Export** - JSON format with merge options
- **History** - Track executed operations with restore

### Settings
- **Themes** - Light, dark, and system preference
- **Languages** - English and Spanish (i18n)
- **Editor Options** - Font size, tab size, minimap

## Screenshots

<p align="center">
  <img width="2555" height="1040" alt="GraphIt main interface" src="https://github.com/user-attachments/assets/d30b21d5-f2fd-4beb-9c50-3d30ed37aaa7" />
</p>

<p align="center">
  <img width="659" height="1220" alt="GraphIt docs explorer" src="https://github.com/user-attachments/assets/20698c65-df8d-46b1-ace1-4e83d86a0eb7" />
</p>

## Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd graphit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment

### Docker (Recommended)

Build and run with Docker Compose:

```bash
docker compose up -d
```

Or build manually:

```bash
docker build -t graphit .
docker run -p 3000:3000 graphit
```


## CORS & Subscriptions Limitations

### CORS
If your GraphQL endpoint doesn't support CORS from the browser:
1. Enable "Proxy Mode" in settings
2. Requests route through `/api/proxy`
3. Configure your server's CORS policy

### WebSocket Subscriptions
- Connect directly to the target endpoint
- No WebSocket proxy (serverless limitation)
- Server must allow WS connections from browser origin


## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run Query | `Ctrl/Cmd + Enter` |
| Prettify | `Ctrl/Cmd + Shift + P` |
| Search Docs | `Ctrl/Cmd + K` |
| New Tab | Click + button |

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
