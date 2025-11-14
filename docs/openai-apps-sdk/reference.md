# Apps SDK Reference Documentation

## Overview

The Apps SDK Reference provides API documentation for building ChatGPT applications with custom tools and components.

## Core Components

### `window.openai` Component Bridge

The component bridge enables custom UI interactions. Detailed documentation is available in the [custom UX build guide](/apps-sdk/build/custom-ux).

## Tool Descriptor Configuration

### Required Fields

Tools must include standard MCP specification fields plus OpenAI-specific `_meta` extensions:

| Field | Type | Purpose |
|-------|------|---------|
| `_meta["securitySchemes"]` | array | Backwards-compatible security configuration |
| `_meta["openai/outputTemplate"]` | string (URI) | HTML template resource location |
| `_meta["openai/widgetAccessible"]` | boolean | Enables component-to-tool calls (default: false) |
| `_meta["openai/toolInvocation/invoking"]` | string (≤64 chars) | Status text during execution |
| `_meta["openai/toolInvocation/invoked"]` | string (≤64 chars) | Status text after completion |

### Annotations

Use the `readOnlyHint` annotation to signal "read-only" operations:

```
annotations: { readOnlyHint: true }
```

This helps AI models with planning and execution strategy.

## Component Resource `_meta` Fields

Configure component rendering behavior:

| Field | Type | Purpose |
|-------|------|---------|
| `_meta["openai/widgetDescription"]` | string | Model-visible summary |
| `_meta["openai/widgetPrefersBorder"]` | boolean | Border rendering hint |
| `_meta["openai/widgetCSP"]` | object | CSP domain configuration |
| `_meta["openai/widgetDomain"]` | string (origin) | Custom subdomain override |

## Tool Results Structure

Tool results support these fields:

| Field | Type | Visibility |
|-------|------|------------|
| `structuredContent` | object | Model + component |
| `content` | string or array | Model + component |
| `_meta` | object | Component only (hidden from model) |

### Error Handling

Return authentication errors using:
```
_meta["mcp/www_authenticate"]: string or string[]
```

Per RFC 7235 for OAuth flow triggers.

## Client-Provided `_meta` Fields

The client supplies these contextual hints:

| Field | When Provided | Type | Purpose |
|-------|---------------|------|---------|
| `_meta["openai/locale"]` | Initialize + calls | string (BCP 47) | Requested language/region |
| `_meta["openai/userAgent"]` | Tool calls | string | Browser/client identifier |
| `_meta["openai/userLocation"]` | Tool calls | object | Coarse location data |
| `_meta["openai/subject"]` | Tool calls | string | Anonymized user ID |

**Note:** Location and user agent are hints only; servers must not depend on them for authorization.

---

**Source**: https://developers.openai.com/apps-sdk/reference
