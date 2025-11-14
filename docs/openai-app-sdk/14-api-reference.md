# Apps SDK API Reference Documentation

## Window Component Bridge

The `window.openai` component bridge enables custom UI components to interact with ChatGPT. See the [custom UX documentation](09-build-custom-ux.md) for implementation details.

## Tool Descriptor Parameters

### Core Fields
Tools should include standard fields from the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool):
- `title`: Tool name
- `description`: Purpose description
- `inputSchema`: JSON Schema for parameters
- `securitySchemes`: Authentication methods

### Required `_meta` Fields

| Field | Type | Limit | Purpose |
|-------|------|-------|---------|
| `securitySchemes` | array | — | Back-compatibility for legacy clients |
| `openai/outputTemplate` | string (URI) | — | Component HTML template resource |
| `openai/widgetAccessible` | boolean | default: false | Enable component→tool bridge calls |
| `openai/toolInvocation/invoking` | string | ≤64 chars | Status during execution |
| `openai/toolInvocation/invoked` | string | ≤64 chars | Status after completion |

### Annotations

Use `readOnlyHint: true` to signal "read-only operations that help model planning," per MCP specification guidelines.

## Component Resource `_meta` Fields

Set on registered resource templates:

| Field | Type | Purpose |
|-------|------|---------|
| `openai/widgetDescription` | string | Human-readable summary reducing redundant narration |
| `openai/widgetPrefersBorder` | boolean | Suggest bordered card rendering |
| `openai/widgetCSP` | object | CSP policy with `connect_domains` and `resource_domains` arrays |
| `openai/widgetDomain` | string (origin) | Custom subdomain (defaults to `https://web-sandbox.oaiusercontent.com`) |

## Tool Results

Returned objects can include:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `structuredContent` | object | Optional | Must match declared `outputSchema` |
| `content` | string or Content[] | Optional | Text/rich content |
| `_meta` | object | Optional | Component-only data (hidden from model) |

Error results use `_meta["mcp/www_authenticate"]` for OAuth challenges (string or string array per RFC 7235).

## Client-Provided `_meta` Fields

| Field | Context | Type | Purpose |
|-------|---------|------|---------|
| `openai/locale` | Initialize/calls | string (BCP 47) | Requested language |
| `openai/userAgent` | Tool calls | string | Analytics/formatting hint |
| `openai/userLocation` | Tool calls | object | Coarse location (city, region, country, timezone, coordinates) |
| `openai/subject` | Tool calls | string | Anonymized user ID for rate limiting |

**Note:** Location and user agent are hints only; servers must never rely on them for authorization.

## MCP Specification References

For complete MCP protocol details, refer to:
- [Official MCP Specification](https://modelcontextprotocol.io/)
- [Tool Definitions](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Resource Protocol](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)

## TypeScript Type Definitions

For TypeScript implementations, use the official SDK:
```bash
npm install @modelcontextprotocol/sdk
```

Type definitions are available in the SDK package for:
- Tool descriptors
- Resource definitions
- Client-server message types
- Authentication schemas
