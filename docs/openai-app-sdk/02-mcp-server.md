# Model Context Protocol (MCP) Documentation

## Overview

The Model Context Protocol is an open specification for connecting language model clients to external tools and resources. As described in the documentation, "MCP server exposes tools that a model can call during a conversation, and return results given specified parameters."

## Core Components

The documentation identifies three essential capabilities for a minimal MCP server:

1. **Tool Discovery** - Servers advertise supported tools with JSON Schema contracts and optional metadata
2. **Tool Execution** - When models select tools, servers receive `call_tool` requests with user-specified arguments and return structured content
3. **Component Rendering** - Tools can reference embedded resources that represent interfaces for display in ChatGPT clients

## Transport Options

The specification supports multiple transport methods. The documentation notes that "the protocol is transport agnostic, you can host the server over Server-Sent Events or Streamable HTTP," with a recommendation favoring Streamable HTTP.

## Key Benefits of Apps SDK Integration

According to the content, standardizing on MCP provides:

- Natural language discovery through model integration with tool metadata
- Structured conversation flow with component state persistence
- Cross-platform compatibility for web and mobile ChatGPT clients
- Built-in authentication mechanisms including OAuth 2.1 flows

## Getting Started Resources

The documentation directs developers to:
- Official MCP specification and SDKs (Python and TypeScript)
- MCP Inspector tool for local testing
- Implementation guides for server setup
