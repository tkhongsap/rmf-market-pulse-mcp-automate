# Building Custom UX for Apps SDK

## Overview

The Apps SDK enables developers to create custom UI components that render inline within ChatGPT conversations. These React components operate within iframes and communicate with the host platform through the `window.openai` API.

## Core Architecture: The `window.openai` API

The bridge between your frontend and ChatGPT operates through a global interface providing:

**Key Properties:**
- Theme and locale information
- Layout constraints (maxHeight, displayMode, safeArea)
- State management (toolInput, toolOutput, widgetState)
- Device capabilities and user agent details

**Essential Methods:**
- `callTool()` – Execute MCP server actions directly from components
- `sendFollowUpMessage()` – Insert conversational prompts
- `requestDisplayMode()` – Transition between inline, picture-in-picture, and fullscreen views
- `setWidgetState()` – Persist component state across sessions

## Recommended Hook Pattern

Developers typically wrap `window.openai` access in custom React hooks for testability. A `useOpenAiGlobal` hook subscribes components to host events, enabling reactive updates when display modes, themes, or props change. This pattern keeps components decoupled from platform specifics.

## Project Structure

Maintain separation between server logic and frontend code:

```
app/
  server/          # MCP server (Python or Node)
  web/             # Component bundle
    src/component.tsx
    dist/component.js
    package.json
```

## Component Implementation Guidelines

**State Persistence:**
Anything passed to `setWidgetState()` becomes visible to the model and persists only for that specific widget instance. Keep payloads under 4,000 tokens to avoid performance degradation.

**Tool Invocation:**
Components can trigger server actions via `callTool()`. Design these tools as idempotent operations returning structured data suitable for model reasoning.

**Navigation:**
Use standard routing libraries (React Router). The host mirrors iframe history into ChatGPT's UI controls automatically.

## Building and Bundling

Use esbuild to compile React components into a single ESM module:

```json
{
  "scripts": {
    "build": "esbuild src/component.tsx --bundle --format=esm --outfile=dist/component.js"
  }
}
```

The resulting JavaScript file embeds directly into server responses.

## Component Examples

The SDK provides reference implementations including ranked card lists, carousels, maps with fullscreen inspection, gallery views, and media players—each demonstrating asset bundling, host API integration, and state synchronization patterns.
