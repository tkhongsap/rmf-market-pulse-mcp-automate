# Build a Custom UX - Documentation Summary

## Overview

The guide explains how to create custom UI components for the Apps SDK that render as React components within iframes, communicating with ChatGPT through the `window.openai` API.

## Key API: `window.openai`

This interface bridges frontend components and ChatGPT, providing:

**Global Properties:**
- Theme, locale, user agent information
- Layout constraints (maxHeight, displayMode, safeArea)
- State management (toolInput, toolOutput, widgetState)

**Methods:**
- `callTool()` – Execute MCP server functions directly
- `sendFollowUpMessage()` – Insert messages into conversation
- `openExternal()` – Navigate to external links
- `requestDisplayMode()` – Switch between inline, PiP, or fullscreen layouts
- `setWidgetState()` – Persist component state across sessions

## Custom Hooks Pattern

The documentation recommends wrapping `window.openai` access in React hooks for testability:

> "`useOpenAiGlobal` is an important primitive to make your app reactive to changes in display mode, theme, and 'props'"

This allows components to subscribe to specific global values and respond to host changes automatically.

## Widget State Management

Widget state enables:
- Persistence across user sessions
- Exposure of data to the language model
- Scoping to individual widget instances (not conversation-wide)
- Token-efficient data storage (keeping payloads under 4k tokens)

## Project Structure

Recommended layout separates server logic from frontend:
```
app/
  server/     # MCP implementation
  web/        # Component source
    src/component.tsx
    dist/component.js (built output)
```

## Component Development Process

1. **Create project** with React, TypeScript, and esbuild
2. **Author React component** reading from `window.openai.toolOutput`
3. **Use example templates** (Pizzaz List, Map, Carousel, Album, Video) as blueprints
4. **Bundle with esbuild** into single ESM module
5. **Embed in server response** for production deployment

## Navigation Integration

Components can use standard routing libraries (React Router). The sandbox environment mirrors iframe history to ChatGPT's UI, keeping navigation controls synchronized.

## Best Practices

- Use `useOpenAiGlobal` hooks for reactive state management
- Keep widget bundles small and optimized (single ESM module)
- Leverage example templates as starting points
- Test components in isolation before MCP integration
- Follow React best practices for component composition
- Handle theme changes dynamically
- Respect display mode constraints (inline, PiP, fullscreen)

## Development Workflow

1. Develop components locally with mock `window.openai` data
2. Bundle with esbuild (production mode for optimization)
3. Integrate bundled output into MCP server resource
4. Test in MCP Inspector before production deployment
5. Monitor performance and optimize bundle size

## Integration Points

**Component → MCP Server:**
- Widget reads `toolOutput` and `toolResponseMetadata` from server responses
- Widget calls server tools via `callTool()` API
- Widget persists state via `setWidgetState()` for cross-session continuity

**Component → ChatGPT:**
- Widget responds to theme and layout changes
- Widget triggers follow-up messages via `sendFollowUpMessage()`
- Widget requests display mode changes (PiP, fullscreen)
- Widget opens external links through `openExternal()`

## TypeScript Support

Full TypeScript definitions available for:
- `window.openai` global object
- All API methods and properties
- Custom hooks (`useOpenAiGlobal`, `useWidgetState`)
- State management types

---

**Source**: https://developers.openai.com/apps-sdk/build/custom-ux
