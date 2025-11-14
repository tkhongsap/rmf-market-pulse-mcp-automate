# OpenAI Apps SDK Quickstart Guide

## Overview

The Apps SDK enables developers to build applications for ChatGPT using two core components:

1. **Web Component**: A custom UI built with any framework, rendered in an iframe within ChatGPT
2. **MCP Server**: A Model Context Protocol server that exposes app capabilities and tools to ChatGPT

## Building the Web Component

Create a file at `public/todo-widget.html` containing your UI. The document establishes communication with ChatGPT through `window.openai`, which provides:

- **`window.openai.toolOutput`**: Initial data injected when ChatGPT loads the iframe
- **`window.openai.callTool(name, payload)`**: Method for invoking backend tools
- **`openai:set_globals` event**: Listener for receiving updated data from ChatGPT

The sample to-do application demonstrates these patterns with a form for adding tasks and checkboxes for marking completion.

## Creating the MCP Server

Install dependencies:
```bash
npm install @modelcontextprotocol/sdk zod
```

The server (Node.js example) must:

1. Register a resource pointing to your HTML component with MIME type `text/html+skybridge`
2. Define tools that ChatGPT can invoke (e.g., `add_todo`, `complete_todo`)
3. Return responses containing both text messages and `structuredContent` with updated state

The server listens at `/mcp` endpoint and handles CORS preflight requests.

## Local Development & Testing

**Starting the server:**
```bash
node server.js
```

**Testing with MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector@latest http://localhost:8787/mcp
```

**Exposing locally to internet:**
```bash
ngrok http <port>
```

## Integration with ChatGPT

1. Enable developer mode in ChatGPT settings
2. Create a connector using your public MCP endpoint URL
3. Add the connector to conversations
4. Refresh after server changes via Settings → Connectors

## Key Concepts

The bridge between frontend and backend maintains synchronization through structured responses. Tools return both human-readable content and machine-readable `structuredContent` that updates the UI component. This pattern ensures ChatGPT can understand outcomes while keeping the interface current.
