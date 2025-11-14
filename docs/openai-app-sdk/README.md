# OpenAI Apps SDK Documentation

This directory contains extracted documentation for building OpenAI apps using the Apps SDK and Model Context Protocol (MCP).

## Contents

0. **[Overview](00-overview.md)** - OpenAI Apps SDK introduction and roadmap
   - Core purpose and platform status
   - Getting started path (Plan, Build, Deploy)
   - Key concepts and important resources

1. **[Quickstart Guide](01-quickstart.md)** - Getting started with OpenAI Apps SDK
   - Building web components
   - Creating MCP servers
   - Local development and testing
   - Integration with ChatGPT

2. **[MCP Server](02-mcp-server.md)** - Model Context Protocol server documentation
   - Core components (tool discovery, execution, rendering)
   - Transport options
   - Key benefits and features
   - Getting started resources

3. **[User Interaction](03-user-interaction.md)** - How users discover and engage with apps
   - Discovery methods (named mention, in-conversation, directory)
   - Entry points (in-conversation access, launcher integration)
   - Best practices for tool descriptions

4. **[Design Guidelines](04-design-guidelines.md)** - App design principles and standards
   - Core design principles
   - Use case framework
   - Display modes (inline, fullscreen, PiP)
   - Visual design standards
   - Tone and communication guidelines

### Planning Phase

5. **[Use Case Planning](05-plan-use-case.md)** - Research and planning methodology
   - Research phase and evaluation prompts
   - Scope definition and prioritization
   - Tool translation from use cases
   - Iteration planning

6. **[Define Tools](06-plan-tools.md)** - Tool design and specifications
   - Tool-first thinking principles
   - Single responsibility and metadata capture
   - Model-side guardrails
   - Validation strategy

7. **[Design Components](07-plan-components.md)** - UI component planning
   - Component patterns (list, map, carousel, etc.)
   - User interaction considerations
   - Data requirements and state management
   - Responsive design and debugging

### Build Phase

8. **[Build MCP Server](08-build-mcp-server.md)** - MCP server implementation
   - SDK selection (Python vs TypeScript)
   - Tool definition and component templates
   - Response structure and setup steps
   - Advanced configuration (CSP, localization)

9. **[Build Custom UX](09-build-custom-ux.md)** - Frontend component development
   - `window.openai` API architecture
   - React hook patterns
   - Project structure and bundling
   - Component implementation guidelines

10. **[Authentication](10-build-auth.md)** - OAuth 2.1 security implementation
    - Three-party architecture
    - MCP authorization spec requirements
    - OAuth flow steps and token verification
    - Recommended providers and testing strategy

11. **[Examples](11-build-examples.md)** - Sample applications and patterns
    - Pizzaz demo app overview
    - GitHub repository with code samples
    - Implementation patterns and best practices
    - Component and tool integration examples

### Deploy Phase

12. **[Testing & Integration](12-deploy-testing.md)** - Testing strategies and validation
    - Unit testing tool handlers
    - MCP Inspector for development
    - ChatGPT developer mode testing
    - Pre-launch validation checklist

13. **[Production Deployment](13-deploy-production.md)** - Hosting and production setup
    - Hosting platform options (containers, serverless, K8s)
    - Critical requirements and HTTPS setup
    - Production readiness checklist
    - Monitoring and maintenance

### Reference

14. **[API Reference](14-api-reference.md)** - Complete API documentation
    - `window.openai` component bridge
    - Tool descriptor parameters and `_meta` fields
    - Component resource configuration
    - Client-provided metadata fields

## Overview

The OpenAI Apps SDK allows developers to build applications for ChatGPT using:
- **Web Component**: Custom UI rendered in an iframe within ChatGPT
- **MCP Server**: Model Context Protocol server that exposes app capabilities to ChatGPT

## Key Concepts

- **Conversational Integration**: Apps should feel like natural extensions of ChatGPT
- **Structured Responses**: Tools return both human-readable content and machine-readable state
- **Tool Discovery**: MCP servers advertise tools with JSON Schema contracts
- **Component Rendering**: Tools reference embedded resources for display in ChatGPT

## Quick Links

- [Official MCP Specification](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [Apps SDK Examples Repository](https://github.com/openai/openai-apps-sdk-examples)
- [Figma Component Library](https://www.figma.com/community/file/1560064615791108827/apps-in-chatgpt-components-templates)
- [API Playground](https://platform.openai.com/playground)

## Our Implementation

This project (Thai Fund Market Pulse) will be adapted to work as an OpenAI app, providing:
- Real-time Thai mutual fund data (RMF, ESG, ESGX)
- Interactive fund browsing and search
- Fund performance visualization
- Integration with ChatGPT for natural language queries

---

*Documentation extracted: 2025-11-12*
