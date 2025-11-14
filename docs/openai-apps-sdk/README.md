# OpenAI Apps SDK Documentation

This directory contains extracted documentation from the OpenAI Apps SDK website (https://developers.openai.com/apps-sdk).

## Extraction Date
Extracted on: 2025-11-14

## Documentation Structure

### Root Level
- `index.md` - Main Apps SDK overview and navigation
- `quickstart.md` - Getting started guide
- `reference.md` - API reference documentation
- `app-developer-guidelines.md` - Guidelines for app developers

### Core Concepts (`concepts/`)
- `mcp-server.md` - Model Context Protocol server concepts
- `user-interaction.md` - User interaction patterns
- `design-guidelines.md` - Design guidelines for ChatGPT apps

### Planning (`plan/`)
- `use-case.md` - Research and identify use cases
- `tools.md` - Define tools for your app
- `components.md` - Design UI components

### Building (`build/`)
- `mcp-server.md` - Set up your MCP server
- `custom-ux.md` - Build custom user experiences
- `auth.md` - Authenticate users with OAuth 2.1
- `state-management.md` - Manage application state
- `examples.md` - Example implementations

### Deployment (`deploy/`)
- `deploy.md` - Deploy your app to production
- `connect-chatgpt.md` - Connect your app to ChatGPT
- `testing.md` - Test your integration
- `troubleshooting.md` - Troubleshooting guide

### Guides (`guides/`)
- `optimize-metadata.md` - Optimize metadata for better discovery
- `security-privacy.md` - Security and privacy best practices

## About Apps SDK

The Apps SDK is OpenAI's framework for building applications that extend ChatGPT functionality. It consists of:

1. **MCP Server** - Exposes tools and capabilities to ChatGPT
2. **Web Components** - Custom UI rendered in iframes within ChatGPT
3. **window.openai API** - Bridge between components and ChatGPT

## Key Features

- **Model Context Protocol (MCP)** - Standardized protocol for connecting tools to language models
- **Component System** - Display modes including inline cards, carousels, fullscreen, and picture-in-picture
- **OAuth 2.1 Authentication** - Secure user authentication with PKCE
- **State Management** - Three-tier state system (business, UI, cross-session)
- **Developer Tools** - MCP Inspector, API Playground, and developer mode

## Documentation Pages Count

Total: 20 pages
- Root: 4 pages
- Concepts: 3 pages
- Plan: 3 pages
- Build: 5 pages
- Deploy: 4 pages (including troubleshooting)
- Guides: 2 pages

## Source

All documentation extracted from: https://developers.openai.com/apps-sdk

## Notes

- Some pages may have been inaccessible during extraction due to network restrictions
- Content is formatted in Markdown for easy reading and integration
- Each file includes a source URL reference at the bottom
- Code examples and technical details are preserved as-is from the original documentation
