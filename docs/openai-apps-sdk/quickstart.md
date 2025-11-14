# Apps SDK Quickstart

## Overview
The Apps SDK enables building ChatGPT applications through two core components: a web component UI and a Model Context Protocol (MCP) server that exposes capabilities to ChatGPT.

## Key Components

**Web Component**: As stated in the docs, "a web component built with the framework of your choice – you are free to build your app as you see fit, that will be rendered in an iframe in the ChatGPT interface."

**MCP Server**: Exposes the app and defines its capabilities (tools) to ChatGPT.

## Technical Architecture

The quickstart demonstrates a to-do list application with:
- HTML/CSS/JavaScript frontend in `public/todo-widget.html`
- Node.js MCP server using the official SDK
- Communication bridge via `window.openai` object

The guide notes that "ChatGPT loads the iframe, it injects the latest tool response into `window.openai.toolOutput`" and subsequent calls to `window.openai.callTool` keep the UI synchronized.

## Development Workflow

1. Build web component (supports React or vanilla HTML)
2. Create MCP server with registered tools and resources
3. Test locally using MCP Inspector
4. Expose via tunnel (ngrok recommended)
5. Add connector to ChatGPT through Settings → Connectors
6. Enable Developer Mode for testing

## Next Steps

The documentation recommends reviewing app developer guidelines, researching use cases, and consulting design guidelines before production deployment.

---

**Source**: https://developers.openai.com/apps-sdk/quickstart
