# Building Custom UX for Apps SDK

## Overview

Custom UI components transform structured tool outputs into user-friendly interfaces. These React components run within an iframe, communicate with ChatGPT through the `window.openai` API, and render inline within conversations.

## The window.openai API

This API bridges your frontend with ChatGPT, providing access to data, state management, and layout controls.

### Key Globals Available

The `window.openai` object exposes:
- **Theme and localization**: Current display theme and user locale
- **Layout info**: Maximum height, display mode, and safe area insets
- **State data**: Tool inputs, outputs, metadata, and widget state
- **Device details**: Device type and capabilities (hover, touch support)

### Core Methods

**Tool Execution**: `callTool(name, args)` executes MCP tools directly from your component.

**Conversations**: `sendFollowUpMessage({ prompt })` inserts user messages into the chat thread.

**Navigation**: `openExternal({ href })` opens links or redirects applications.

**Layout Control**: `requestDisplayMode({ mode })` switches between inline, picture-in-picture, and fullscreen views.

**State Persistence**: `setWidgetState(state)` stores component data for reuse across sessions while exposing it to the language model.

### useOpenAiGlobal Hook Pattern

Wrapping `window.openai` access in custom React hooks maintains testability:

```typescript
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) return;
        onChange();
      };
      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });
      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai[key]
  );
}
```

This pattern enables reactive components that respond to display changes, theme updates, and prop modifications.

## Project Structure

Separate component code from server logic:

```
app/
  server/          # MCP server (Python/Node)
  web/             # Component source
    package.json
    tsconfig.json
    src/component.tsx
    dist/component.js
```

Initialize with Node 18+:
```bash
npm init -y
npm install react@^18 react-dom@^18
npm install -D typescript esbuild
```

## Component Development

Your entry point should mount a React component to a root element, reading initial data from `window.openai.toolOutput` or persisted widget state.

### State Management Patterns

**Widget State Hook** maintains synchronization between host-persisted and local component state, automatically syncing changes with ChatGPT.

**Derived Hooks** provide convenient access to tool inputs, outputs, and metadata:

```typescript
export function useToolInput() {
  return useOpenAiGlobal("toolInput");
}

export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}
```

### Navigation Implementation

Use standard routing libraries like React Router. Skybridge mirrors iframe history to ChatGPT's UI automatically:

```typescript
export default function PizzaListRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PizzaListApp />}>
          <Route path="place/:placeId" element={<PizzaListApp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Example Component Patterns

The SDK provides reference implementations:

- **List View**: Card-based layouts with favorites and CTAs
- **Carousel**: Media-heavy horizontal scrollers using embla
- **Map Integration**: Mapbox with fullscreen inspection
- **Gallery**: Stacked views for detailed exploration
- **Video Player**: Scripted playback with overlay controls

## Building and Bundling

Configure esbuild to create a single JavaScript module:

```json
{
  "scripts": {
    "build": "esbuild src/component.tsx --bundle --format=esm --outfile=dist/component.js"
  }
}
```

Run `npm run build` to generate the output file for server embedding.

## Integration with Server

The compiled component bundle embeds into your MCP server response. During development, rebuild the bundle whenever React code changes and hot-reload the server.

## Important Constraints

- Widget state should remain under 4k tokens for performance
- State persists only for the specific widget instance on a message
- New chat submissions create fresh widgets with empty state
- Tools initiated by components must be marked for component access in the server configuration

---

**Source**: https://developers.openai.com/apps-sdk/build/custom-ux
