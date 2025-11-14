# Connect from ChatGPT

## Overview
This guide explains how to link your MCP server-based app to ChatGPT for testing and integration.

## Prerequisites
- **Developer Mode**: Access through Settings → Apps & Connectors → Advanced settings
- **HTTPS Requirement**: Your MCP server must be publicly accessible via HTTPS
- **Local Development**: Use tunneling tools like ngrok or Cloudflare Tunnel to expose local servers

## Creating a Connector

### Setup Steps
1. Enable developer mode in ChatGPT settings
2. Access the "Create" button under Settings → Apps & Connectors
3. Configure connector details:
   - **Name**: User-facing title describing your app
   - **Description**: Explains functionality and use cases for model discovery
   - **URL**: Public `/mcp` endpoint (e.g., `https://abc123.ngrok.app/mcp`)

### Verification
Upon creation, ChatGPT displays advertised tools. Connection failures require debugging via MCP Inspector or API Playground.

## Testing Your Integration

### In ChatGPT
1. Open a new conversation
2. Click the **+** button and select "More"
3. Choose your connector from available tools
4. Prompt the model with relevant requests (e.g., "What tasks are available?")

ChatGPT displays tool payloads for confirmation. Write operations require approval unless remembered for the session.

## Maintenance

**Refreshing Metadata**: After updating tools or descriptions, revisit Settings → Connectors, select your connector, and click "Refresh."

## Alternative Clients
- **API Playground**: Add MCP server via Tools → Add → MCP Server for request/response logging
- **Mobile**: Once linked on web, connectors automatically appear on mobile apps

---

**Source**: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
