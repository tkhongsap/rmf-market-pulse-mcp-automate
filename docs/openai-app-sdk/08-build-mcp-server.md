# MCP Server Setup Documentation

## Overview
The MCP (Model Context Protocol) server forms the foundation of Apps SDK integrations. It exposes tools the model can call, enforces authentication, and packages structured data with component HTML for ChatGPT to render.

## SDK Selection

Two official SDKs are available:

- **Python SDK**: Ideal for rapid prototyping using FastMCP. Find it at `modelcontextprotocol/python-sdk` on GitHub.
- **TypeScript SDK**: Best for Node/React stacks using `@modelcontextprotocol/sdk` package.

## Core Components

### Tool Definition
Tools represent the contract between ChatGPT and your backend. Each tool requires:
- Machine-readable name
- User-friendly title
- JSON schema describing parameters
- Metadata including authentication hints and component configuration

### Component Templates
Each tool should reference an HTML UI template:

1. **Register the template** as a resource with `mimeType: "text/html+skybridge"`
2. **Link tools to templates** via `_meta["openai/outputTemplate"]` using the resource URI
3. **Version carefully** with unique URIs to prevent stale asset loading

### Response Structure
Tool responses contain three fields:

- **`structuredContent`**: Data hydrating your component (visible to model)
- **`content`**: Optional free-form text or Markdown (visible to model)
- **`_meta`**: Arbitrary JSON for component-only use (hidden from model)

## Setup Steps

### 1. Basic Server Creation
Initialize an MCP server with your chosen SDK and configure it to register tools and resources.

### 2. Bundle Assets
Compile JavaScript/CSS components and load them into resource responses for serving to ChatGPT.

### 3. Local Testing
Use MCP Inspector pointing to `http://localhost:<port>/mcp` to validate tool responses and component rendering.

### 4. Public Exposure
Deploy to HTTPS endpoint or use tunneling (ngrok) for development: `ngrok http <port>`

### 5. Authentication & State
Add OAuth 2.1 flows and user state management using dedicated guides.

## Advanced Configuration

**Component Accessibility**: Mark tools with `_meta.openai/widgetAccessible: true` for component-initiated tool calls.

**CSP Definition**: Declare content security policies via `openai/widgetCSP` with `connect_domains` and `resource_domains` arrays.

**Subdomains**: Configure `openai/widgetDomain` to render components on custom sandboxed subdomains.

**Localization**: Echo requested locale from `_meta["openai/locale"]` during initialization and subsequent requests to serve translated content.
