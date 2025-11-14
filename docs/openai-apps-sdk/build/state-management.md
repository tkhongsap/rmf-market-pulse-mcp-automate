# State Management in ChatGPT Apps

## Overview

State in ChatGPT applications falls into three distinct categories:

| State Type | Owner | Lifetime | Use Cases |
|---|---|---|---|
| Business data | MCP server/backend | Long-lived | Tasks, tickets, documents |
| UI state | Widget instance | Active widget only | Selection, expansion, sorting |
| Cross-session state | Backend storage | Across conversations | Filters, preferences, workspace |

The fundamental principle: "Place every piece of state where it belongs so the UI stays consistent."

## How Widgets Function in ChatGPT

Widgets are message-scoped instances tied to specific conversation messages. Key behaviors include:

- **Fresh instances per response**: Each widget gets its own independent UI state
- **State persistence**: Reopening a message restores saved UI interactions
- **Data-driven updates**: Business data refreshes trigger widget re-renders with preserved UI state

The mental model separates concerns:
```
Server (source of truth)
    ↓
ChatGPT Widget
    ├── Authoritative data snapshot
    └── Ephemeral UI state
         ↓
    Rendered view
```

## 1. Business State (Authoritative)

Business data must live on your MCP server or backend—never in the widget. This prevents divergence between frontend and backend states.

**Workflow**:
1. UI calls server tool
2. Server updates data
3. Server returns authoritative snapshot
4. Widget re-renders with snapshot

### MCP Server Example (Node.js)

```javascript
import { Server } from "@modelcontextprotocol/sdk/server";
import { jsonSchema } from "@modelcontextprotocol/sdk/schema";

const tasks = new Map();
let nextId = 1;

const server = new Server({
  tools: {
    get_tasks: {
      description: "Return all tasks",
      inputSchema: jsonSchema.object({}),
      async run() {
        return {
          structuredContent: {
            type: "taskList",
            tasks: Array.from(tasks.values()),
          }
        };
      }
    },
    add_task: {
      description: "Add a new task",
      inputSchema: jsonSchema.object({ title: jsonSchema.string() }),
      async run({ title }) {
        const id = `task-${nextId++}`;
        tasks.set(id, { id, title, done: false });
        return this.tools.get_tasks.run({});
      }
    }
  }
});

server.start();
```

## 2. UI State (Ephemeral)

UI state describes presentation logic—how data displays, not the data itself. Store it within widget instances using:

- `window.openai.widgetState` – read current snapshot
- `window.openai.setWidgetState(newState)` – write updates

The persistence happens asynchronously; no awaiting required.

### React Implementation

```javascript
import { useWidgetState } from "./use-widget-state";

export function TaskList({ data }) {
  const [widgetState, setWidgetState] = useWidgetState(() => ({
    selectedId: null,
  }));

  const selectTask = (id) => {
    setWidgetState((prev) => ({ ...prev, selectedId: id }));
  };

  return (
    <ul>
      {data.tasks.map((task) => (
        <li
          key={task.id}
          style={{
            fontWeight: widgetState?.selectedId === task.id ? "bold" : "normal",
          }}
          onClick={() => selectTask(task.id)}
        >
          {task.title}
        </li>
      ))}
    </ul>
  );
}
```

### Vanilla JavaScript Implementation

```javascript
const tasks = window.openai.toolOutput?.tasks ?? [];
let widgetState = window.openai.widgetState ?? { selectedId: null };

function selectTask(id) {
  widgetState = { ...widgetState, selectedId: id };
  window.openai.setWidgetState(widgetState);
  renderTasks();
}

function renderTasks() {
  const list = document.querySelector("#task-list");
  list.innerHTML = tasks
    .map(
      (task) => `
        <li
          style="font-weight: ${
            widgetState.selectedId === task.id ? "bold" : "normal"
          }"
          onclick="selectTask('${task.id}')"
        >
          ${task.title}
        </li>
      `
    )
    .join("");
}

renderTasks();
```

## 3. Cross-Session State

Preferences persisting across conversations should live in backend storage. This requires:

- User authentication via OAuth
- Integration with existing storage APIs
- Consideration for latency, data residency, rate limits

### React Component Example

```javascript
import { useState } from "react";

export function PreferencesForm({ userId, initialPreferences }) {
  const [formState, setFormState] = useState(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  async function savePreferences(next) {
    setIsSaving(true);
    setFormState(next);
    window.openai.setWidgetState(next);

    const result = await window.openai.callTool("set_preferences", {
      userId,
      preferences: next,
    });

    const updated = result?.structuredContent?.preferences ?? next;
    setFormState(updated);
    window.openai.setWidgetState(updated);
    setIsSaving(false);
  }

  return (
    <form>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => savePreferences(formState)}
      >
        {isSaving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
```

### Server Backend (Node.js)

```javascript
import { Server } from "@modelcontextprotocol/sdk/server";
import { jsonSchema } from "@modelcontextprotocol/sdk/schema";
import { request } from "undici";

async function readPreferences(userId) {
  const response = await request(
    `https://api.example.com/users/${userId}/preferences`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
    }
  );
  if (response.statusCode === 404) return {};
  if (response.statusCode >= 400) throw new Error("Load failed");
  return await response.body.json();
}

async function writePreferences(userId, preferences) {
  const response = await request(
    `https://api.example.com/users/${userId}/preferences`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preferences)
    }
  );
  if (response.statusCode >= 400) throw new Error("Save failed");
  return await response.body.json();
}

const server = new Server({
  tools: {
    get_preferences: {
      inputSchema: jsonSchema.object({ userId: jsonSchema.string() }),
      async run({ userId }) {
        const preferences = await readPreferences(userId);
        return { structuredContent: { type: "preferences", preferences } };
      }
    },
    set_preferences: {
      inputSchema: jsonSchema.object({
        userId: jsonSchema.string(),
        preferences: jsonSchema.object({})
      }),
      async run({ userId, preferences }) {
        const updated = await writePreferences(userId, preferences);
        return { structuredContent: { type: "preferences", preferences: updated } };
      }
    }
  }
});
```

## Best Practices Summary

✓ Place authoritative business data on the server
✓ Manage UI state within widgets using provided APIs
✓ Store durable cross-session state in backend storage
✓ Remember widget state persists only for message-specific instances
✗ Avoid relying on `localStorage` for critical state

This layered approach ensures data consistency while maintaining responsive, interactive UI experiences.

---

**Source**: https://developers.openai.com/apps-sdk/build/state-management
