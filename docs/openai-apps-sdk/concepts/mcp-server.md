# MCP Server Concepts

## Overview
This page explains the Model Context Protocol (MCP) and its role within the Apps SDK framework for connecting language models to external tools and resources.

## Key Sections

### What is MCP?
The page defines MCP as "an open specification for connecting large language model clients to external tools and resources." MCP servers expose tools that models can invoke during conversations, returning results based on specified parameters. The framework enables servers to return metadata alongside tool results, including inline HTML for interface rendering in the Apps SDK.

The documentation emphasizes that "MCP is the backbone that keeps server, model, and UI in sync" by standardizing wire formats, authentication, and metadata handling.

### Protocol Building Blocks
A minimal MCP server implementation requires three capabilities:

1. **List tools** – advertising supported tools with JSON Schema contracts and annotations
2. **Call tools** – executing actions when models select tools, returning structured content
3. **Return components** – optionally pointing to embedded resources representing rendered interfaces

The specification supports both Server-Sent Events and Streamable HTTP transports, with Streamable HTTP recommended.

### Benefits of MCP Standardization
Key advantages listed include:
- **Discovery integration** – natural-language tool discovery and launcher ranking
- **Conversation awareness** – structured content and component state persistence
- **Multiclient support** – works across ChatGPT platforms without custom code
- **Extensible auth** – OAuth 2.1 flows and dynamic client registration

## Resources Provided
The page recommends:
- Official MCP specification
- Python SDK and TypeScript SDK
- MCP Inspector debugging tool

---

**Source**: https://developers.openai.com/apps-sdk/concepts/mcp-server
