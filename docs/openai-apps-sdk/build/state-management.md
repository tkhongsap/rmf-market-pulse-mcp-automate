# Managing State in ChatGPT Apps

## Overview

State in ChatGPT apps using the Apps SDK falls into three distinct categories:

| Type | Owner | Lifetime | Examples |
|------|-------|----------|----------|
| Business data | MCP server/backend | Long-lived | Tasks, tickets, documents |
| UI state | Widget instance | Active widget only | Selected rows, expanded panels |
| Cross-session state | Backend/storage | Across conversations | Saved filters, preferences |

## How Widgets Work

Custom UI components render within ChatGPT as message-scoped widgets. Each response creates a fresh instance, but reopening the same message restores saved UI state. The server provides authoritative data; the widget applies its local visual state on top.

## Business State (Authoritative)

Business data should reside on your MCP server or backend—never in the widget. This prevents UI/server divergence:

1. UI calls a server tool
2. Server updates and returns new data
3. Widget re-renders with that snapshot

The example provided demonstrates a task manager where tools like `get_tasks` and `add_task` always return the complete, updated state.

## UI State (Ephemeral)

UI state manages *how* data appears, not the data itself. Access it via:

- `window.openai.widgetState` – read state
- `window.openai.setWidgetState(newState)` – write state
- `useWidgetState` hook – React convenience wrapper

Widgets persist their UI state asynchronously without requiring awaits. Call state updates immediately after UI interactions.

## Cross-Session State

Preferences lasting beyond single conversations belong in backend storage. This model requires:

- User authentication via OAuth
- Low-latency API calls
- Consideration of data residency, rate limiting, and schema versioning

Avoid `localStorage` for critical state. Instead, integrate existing backend APIs or implement new ones to preserve user preferences.

---

**Source**: https://developers.openai.com/apps-sdk/build/state-management
