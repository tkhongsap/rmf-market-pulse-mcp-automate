# Design Components - Complete Guide

## Overview
This page guides developers through planning and designing UI components for ChatGPT applications built with the OpenAI Apps SDK.

## Why Components Matter

Components serve as the user-facing interface for connectors. According to the documentation, they enable users to "view or edit data inline, switch to fullscreen when needed, and keep context synchronized between typed prompts and UI actions." Early planning ensures the MCP server returns appropriate structured data and metadata.

## Sample Components Available

The `openai-apps-sdk-examples` repository provides reusable patterns:

- **List**: Displays dynamic collections with empty-state handling
- **Map**: Shows geographic data with marker clustering and detail panes
- **Album**: Presents media grids with fullscreen transitions
- **Carousel**: Features content with swipe gesture support
- **Shop**: Demonstrates product browsing with checkout options

## Key Planning Considerations

### User Interaction Clarification
Developers should determine:
- Whether components are read-only (charts, dashboards) or support editing
- If tasks complete in one invocation or persist across multiple turns
- Whether inline cards suffice or fullscreen modes are necessary

### Data Requirements
Components need:
- Structured JSON payloads for parsing
- Initial state via `window.openai.toolOutput`
- Subsequent state from `callTool` return values
- State caching through `window.openai.setWidgetState`
- Authentication context when needed

### Responsive Design
Components must accommodate:
- Adaptive layouts that collapse gracefully on small screens
- Dark mode support matching system preferences
- Accessible keyboard navigation and focus states
- Consistent CSS variables and iconography

### State Management
The guidance specifies three storage layers:
- **Component state**: User interactions tracked via `setWidgetState`
- **Server state**: Authoritative data in backend or built-in storage
- **Model messages**: Human-readable updates via `sendFollowUpMessage`

### Telemetry and Debugging
Plans should include:
- Analytics for component loads and user actions
- Tool-call ID logging for end-to-end tracing
- Fallback displays when components fail to load

## Next Steps
After completing this planning phase, developers proceed to [Build a custom UX](/apps-sdk/build/custom-ux) for implementation details.

---

**Source**: https://developers.openai.com/apps-sdk/plan/components
