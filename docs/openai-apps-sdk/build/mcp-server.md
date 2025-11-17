# Build Your MCP Server: Complete Documentation

## Overview

Building a ChatGPT App requires three components working in concert: your backend MCP server (which defines tools and manages authentication), a UI bundle that renders within ChatGPT's sandbox, and the model itself, which decides when to invoke your tools. The server maintains clean boundaries between these layers, enabling independent iteration on interface and data logic.

### Key Architectural Principle

"ChatGPT Apps have three components: Your MCP server defines tools, enforces auth, returns data, and points each tool to a UI bundle. The widget/UI bundle renders inside ChatGPT's iframe, reading data and widget-runtime globals exposed through `window.openai`. The model decides when to call tools and narrates the experience using the structured data you return."

## Prerequisites

You'll need familiarity with TypeScript or Python, a web bundler (Vite or esbuild), an HTTP-accessible MCP server, and a built UI bundle exporting a root script in React or vanilla JavaScript. A typical project structure separates the server code, web components, and distribution assets.

## Widget Runtime: `window.openai`

The sandboxed iframe exposes a single global object providing state management, data access, and API capabilities:

**State & Data Access:**
- `toolInput`: Arguments passed during tool invocation
- `toolOutput`: Your `structuredContent` payload
- `toolResponseMetadata`: The `_meta` payload (widget-only, invisible to model)
- `widgetState`: Persisted UI state snapshot
- `setWidgetState(state)`: Synchronously stores UI state after interactions

**Widget APIs:**
- `callTool(name, args)`: Invoke tools from within the widget
- `sendFollowUpMessage({ prompt })`: Have ChatGPT post a message
- `requestDisplayMode`: Request picture-in-picture or fullscreen
- `requestModal`: Spawn a modal overlay
- `notifyIntrinsicHeight`: Report dynamic heights
- `openExternal({ href })`: Open vetted external links

**Context Signals:**
- `theme`, `displayMode`, `maxHeight`, `safeArea`, `view`, `userAgent`, `locale`

React components can use `useOpenAiGlobal` to subscribe to these fields for synchronized updates across components.

## Implementation Steps

### Step 1: Register Component Template

Expose your UI bundle as an MCP resource with MIME type `text/html+skybridge`, which signals ChatGPT to treat it as a sandboxed widget entry point:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";

const server = new McpServer({ name: "kanban-server", version: "1.0.0" });
const HTML = readFileSync("web/dist/kanban.js", "utf8");
const CSS = readFileSync("web/dist/kanban.css", "utf8");

server.registerResource(
  "kanban-widget",
  "ui://widget/kanban-board.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/kanban-board.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="kanban-root"></div>
<style>${CSS}</style>
<script type="module">${HTML}</script>
        `.trim(),
        _meta: {
          "openai/widgetPrefersBorder": true,
          "openai/widgetDomain": "https://chatgpt.com",
          "openai/widgetCSP": {
            connect_domains: ["https://chatgpt.com"],
            resource_domains: ["https://*.oaistatic.com"],
          },
        },
      },
    ],
  })
);
```

**Best Practice:** Version template URIs when making breaking changes so ChatGPT loads fresh bundles rather than cached versions.

### Step 2: Define Tools

Each tool represents a distinct user intent. Descriptors must include machine-readable names, schemas (using zod, JSON Schema, or dataclasses), template references, and optional metadata for UI strings:

```typescript
server.registerTool(
  "kanban-board",
  {
    title: "Show Kanban Board",
    inputSchema: { workspace: z.string() },
    _meta: {
      "openai/outputTemplate": "ui://widget/kanban-board.html",
      "openai/toolInvocation/invoking": "Preparing the board…",
      "openai/toolInvocation/invoked": "Board ready.",
    },
  },
  async ({ workspace }) => {
    const board = await loadBoard(workspace);
    return {
      structuredContent: board.summary,
      content: [{ type: "text", text: `Showing board ${workspace}` }],
      _meta: board.details,
    };
  }
);
```

**Important:** Keep handlers idempotent—the model may retry calls. The model inspects tool descriptors to determine relevance, making names, descriptions, and schemas part of your user experience design.

### Step 3: Structure Response Payloads

Every tool response contains three sibling payloads:

- **`structuredContent`**: Concise JSON the widget reads and the model processes. Include only data the model should understand.
- **`content`**: Optional narrative text (Markdown or plaintext) for the model's response.
- **`_meta`**: Large or sensitive data exclusively for the widget; never visible to the model.

```typescript
async function loadKanbanBoard(workspace: string) {
  const tasks = await db.fetchTasks(workspace);
  return {
    structuredContent: {
      columns: ["todo", "in-progress", "done"].map((status) => ({
        id: status,
        title: status.replace("-", " "),
        tasks: tasks.filter((task) => task.status === status).slice(0, 5),
      })),
    },
    content: [
      {
        type: "text",
        text: "Here's the latest snapshot. Drag cards in the widget to update status.",
      },
    ],
    _meta: {
      tasksById: Object.fromEntries(tasks.map((task) => [task.id, task])),
      lastSyncedAt: new Date().toISOString(),
    },
  };
}
```

The widget accesses these through `window.openai.toolOutput` and `window.openai.toolResponseMetadata`, while the model only receives `structuredContent` and `content`.

### Step 4: Local Testing

Build your UI bundle and start the MCP server:

```bash
npm run build       # compile server + widget
node dist/index.js  # start the compiled MCP server
```

Use the MCP Inspector early and often—it mirrors ChatGPT's widget runtime and catches issues before deployment.

### Step 5: Expose HTTPS Endpoint

ChatGPT requires HTTPS. During development, tunnel localhost using ngrok:

```bash
ngrok http <port>
# Forwarding: https://<subdomain>.ngrok.app -> http://127.0.0.1:<port>
```

For production, deploy to a low-latency HTTPS host such as Cloudflare Workers, Fly.io, Vercel, or AWS.

## Complete Minimal Example

```typescript
// server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "hello-world", version: "1.0.0" });

server.registerResource("hello", "ui://widget/hello.html", {}, async () => ({
  contents: [
    {
      uri: "ui://widget/hello.html",
      mimeType: "text/html+skybridge",
      text: `
<div id="root"></div>
<script type="module" src="https://example.com/hello-widget.js"></script>
      `.trim(),
    },
  ],
}));

server.registerTool(
  "hello_widget",
  {
    title: "Show hello widget",
    inputSchema: { name: { type: "string" } },
    _meta: { "openai/outputTemplate": "ui://widget/hello.html" },
  },
  async ({ name }) => ({
    structuredContent: { message: `Hello ${name}!` },
    content: [{ type: "text", text: `Greeting ${name}` }],
    _meta: {},
  })
);
```

```javascript
// hello-widget.js
const root = document.getElementById("root");
const { message } = window.openai.toolOutput ?? { message: "Hi!" };
root.textContent = message;
```

## Advanced Features

**Widget-Initiated Tool Calls:** Set `"openai/widgetAccessible": true` to enable `window.openai.callTool` for direct tool invocation from your component.

**Content Security Policy:** Provide `openai/widgetCSP` specifying allowed domains for network and resource access:

```json
"openai/widgetCSP": {
  "connect_domains": ["https://api.example.com"],
  "resource_domains": ["https://persistent.oaistatic.com"]
}
```

**Localization:** ChatGPT provides locale information via `_meta["openai/locale"]`. Use RFC 4647 matching to select appropriate locales and format content accordingly.

**Component Descriptions:** Use `"openai/widgetDescription"` to help the model understand what your widget does, reducing redundant narration.

## Troubleshooting

- **Widget doesn't render**: Verify MIME type is `text/html+skybridge` and bundled JS/CSS URLs resolve within the sandbox.
- **`window.openai` undefined**: The runtime only injects for `text/html+skybridge` templates. Check MIME type and CSP violations.
- **CSP or CORS failures**: Use `openai/widgetCSP` to explicitly allow required domains.
- **Stale bundles**: Cache-bust template URIs when deploying breaking changes.
- **Performance issues**: Trim `structuredContent` to only what the model needs; oversized payloads degrade performance.

## Security Considerations

Never embed API keys, tokens, or secrets in `structuredContent`, `content`, `_meta`, or widget state—all are user-visible. Do not rely on client-side hints like `userAgent` or `locale` for authorization; enforce authentication within your MCP server and backing APIs. Avoid exposing destructive or admin-only tools without proper identity verification.
