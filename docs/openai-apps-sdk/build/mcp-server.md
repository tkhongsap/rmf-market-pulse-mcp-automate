# Building Your MCP Server for ChatGPT Apps

## Overview

ChatGPT Apps rely on three interconnected components: your MCP server (defining tools and returning data), a widget/UI bundle (rendering in ChatGPT's sandbox), and the AI model (deciding when to invoke tools).

The architecture follows this flow:
1. User prompt triggers ChatGPT to call an MCP tool
2. Server processes the request and returns `structuredContent`, `_meta`, and UI metadata
3. ChatGPT loads the HTML template and injects the payload via `window.openai`
4. Widget renders and can trigger additional tool calls
5. Model uses `structuredContent` to narrate outcomes

## Prerequisites

- Proficiency with TypeScript/Python and a web bundler (Vite, esbuild)
- HTTP-accessible MCP server (localhost works initially)
- Built UI bundle exporting a root script (React or vanilla JavaScript)

## Core Concepts: window.openai Runtime

The sandboxed iframe exposes `window.openai` with these essential properties:

**State & Data:**
- `toolInput` — Arguments from tool invocation
- `toolOutput` — Your `structuredContent` (model reads this verbatim)
- `toolResponseMetadata` — The `_meta` payload (widget-only)
- `widgetState` — UI state snapshot persisting between renders
- `setWidgetState(state)` — Persist new state synchronously

**Widget APIs:**
- `callTool(name, args)` — Invoke another MCP tool from widget
- `sendFollowUpMessage({ prompt })` — Post message to ChatGPT
- `requestModal` — Spawn ChatGPT-owned modal overlay
- `notifyIntrinsicHeight` — Report dynamic widget heights
- `openExternal({ href })` — Open vetted external link

**Context:**
- `theme`, `displayMode`, `maxHeight`, `safeArea`, `locale` — Environment signals readable or subscribable via `useOpenAiGlobal`

## Implementation Steps

### Step 1: Register Component Template

Each UI bundle is exposed as an MCP resource with `mimeType: "text/html+skybridge"`. This signals to ChatGPT that the content should render as a sandboxed widget:

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

**Best Practice:** Version template URIs when making breaking changes to prevent stale cached bundles.

### Step 2: Define Tools with Metadata

Tools represent user intents. Each descriptor should contain:
- Machine-readable name and human-readable title
- JSON schema for arguments
- `_meta["openai/outputTemplate"]` linking to template URI
- Optional metadata for invocation strings and capabilities

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

Design handlers to be idempotent, as the model may retry failed calls.

### Step 3: Structure Response Data

Tool responses contain three payloads:

**`structuredContent`** — Concise JSON the widget uses and the model reads (model narrates this content)

**`content`** — Optional narration (Markdown/plaintext) for model response

**`_meta`** — Large or sensitive data exclusively for the widget (never reaches model)

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
        text: "Drag cards in the widget to update status.",
      },
    ],
    _meta: {
      tasksById: Object.fromEntries(tasks.map((task) => [task.id, task])),
      lastSyncedAt: new Date().toISOString(),
    },
  };
}
```

### Step 4: Local Testing

1. Build UI bundle: `npm run build` in the `web/` directory
2. Start MCP server
3. Use MCP Inspector to test tool calls and verify widget rendering

```bash
npm run build
node dist/index.js
```

### Step 5: Deploy with HTTPS

ChatGPT requires HTTPS. Use a tunnel for development:

```bash
ngrok http <port>
# Use https://<subdomain>.ngrok.app in ChatGPT developer mode
```

For production, deploy to HTTPS infrastructure (Cloudflare Workers, Fly.io, Vercel, AWS).

## Example Implementation

**Server Code:**
```typescript
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

**Widget Code:**
```javascript
const root = document.getElementById("root");
const { message } = window.openai.toolOutput ?? { message: "Hi!" };
root.textContent = message;
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Widget won't render | Verify `mimeType: "text/html+skybridge"` and bundled URLs resolve in sandbox |
| `window.openai` undefined | Check MIME type; only `text/html+skybridge` templates receive runtime injection |
| CSP/CORS errors | Define exact allowed domains in `openai/widgetCSP` |
| Cached bundles persist | Change template URI or filename with each breaking change |
| Large payloads | Trim `structuredContent` to what the model needs; oversized payloads degrade performance |

## Advanced Features

**Component-Initiated Tool Calls:**
Enable `_meta.openai/widgetAccessible: true` for widgets to invoke tools independently:

```typescript
"_meta": {
  "openai/outputTemplate": "ui://widget/kanban-board.html",
  "openai/widgetAccessible": true
}
```

**Content Security Policy:**
Restrict sandbox access to specific domains:

```typescript
"openai/widgetCSP": {
  connect_domains: ["https://api.example.com"],
  resource_domains: ["https://persistent.oaistatic.com"]
}
```

**Dedicated Widget Domain:**
```typescript
"openai/widgetDomain": "https://chatgpt.com"
```

**Localization:**
ChatGPT provides requested locale in `_meta["openai/locale"]`. Use RFC 4647 matching to select the closest supported locale and format content accordingly.

## Security Considerations

- Treat `structuredContent`, `content`, `_meta`, and widget state as user-visible—never embed credentials or secrets
- Never rely on context hints for authorization; enforce auth inside your MCP server
- Avoid exposing destructive or admin-only tools without proper caller verification

---

**Next Step:** Review the [custom UX guide](/apps-sdk/build/custom-ux) for detailed widget development patterns.

**Source**: https://developers.openai.com/apps-sdk/build/mcp-server
