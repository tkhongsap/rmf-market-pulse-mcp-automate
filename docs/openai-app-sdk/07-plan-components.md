# Design Components Documentation

## Overview
The design components guide helps developers plan and implement UI components for ChatGPT app integrations. Components serve as "the human-visible half of your connector," enabling users to view, edit, and interact with data inline while maintaining context synchronization.

## Key Principles

**Why Components Matter**
Planning UI components early ensures your MCP server returns properly structured data. Components allow users to "view or edit data inline, switch to fullscreen when needed, and keep context synchronized between typed prompts and UI actions."

## Sample Components

The documentation showcases five reusable patterns from the openai-apps-sdk-examples repository:

1. **List** – Renders dynamic collections with empty-state handling
2. **Map** – Plots geographic data with marker clustering
3. **Album** – Showcases media grids with fullscreen transitions
4. **Carousel** – Highlights featured content with swipe gestures
5. **Shop** – Demonstrates product browsing with checkout features

## Design Considerations

**User Interaction Clarification**
Determine three key aspects for each component:
- Viewer vs. editor functionality (read-only vs. interactive)
- Single-shot vs. multiturn engagement (one-time task vs. persistent state)
- Inline vs. fullscreen presentation modes

**Data Requirements**
Structure your JSON payload so "components should receive everything they need in the tool response." Use `window.openai.toolOutput` for initial render data and `window.openai.setWidgetState` for state caching.

**Responsive Design**
Plan adaptive breakpoints, respect system dark mode, ensure keyboard navigation accessibility, and maintain visibility during fullscreen transitions.

**State Management**
Define clear boundaries between component state (using `setWidgetState`), server state (backend storage), and model messages (human-readable transcript updates).

**Debugging & Telemetry**
Establish instrumentation for analytics events, tool-call ID logging, and fallback JSON display when components fail to load.
