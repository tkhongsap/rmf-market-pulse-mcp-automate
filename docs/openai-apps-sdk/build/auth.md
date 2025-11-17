# Authentication Documentation for Apps SDK

## Overview

The Apps SDK authentication guide covers implementing OAuth 2.1 flows to protect MCP servers that handle customer data or write operations. The documentation emphasizes using established identity providers rather than building authentication from scratch.

## Key Components

Three main players execute authenticated requests:

1. **Resource server** – The MCP server hosting protected tools
2. **Authorization server** – Identity provider issuing tokens (Auth0, Okta, Cognito, or custom)
3. **Client** – ChatGPT acting on the user's behalf with dynamic registration and PKCE support

## MCP Authorization Spec Requirements

### Protected Resource Metadata

The MCP server must expose an HTTPS endpoint at `/.well-known/oauth-protected-resource` describing available authorization servers and supported scopes. The response includes:

- `resource`: canonical HTTPS identifier for the MCP server
- `authorization_servers`: issuer base URLs for identity providers
- `scopes_supported`: permissions list (optional but helpful)
- `resource_documentation`: URL explaining the setup

Servers can alternatively advertise this via `WWW-Authenticate` headers on 401 responses.

### OAuth Metadata Publication

Authorization servers must expose discovery documents at standard well-known endpoints:
- OAuth 2.0: `/.well-known/oauth-authorization-server`
- OpenID Connect: `/.well-known/openid-configuration`

Critical fields include authorization and token endpoints, JWKS URI, registration endpoint, and explicit `code_challenge_methods_supported: ["S256"]` declaration (PKCE requirement).

### Resource Parameter Echo

ChatGPT appends `resource` query parameters to authorization and token requests. The authorization server should copy this value into issued access tokens (typically the `aud` claim) so the MCP server can verify tokens were minted specifically for it.

## OAuth Flow Steps

1. ChatGPT queries the MCP server for protected resource metadata
2. ChatGPT performs dynamic client registration with the authorization server
3. User launches OAuth authorization-code + PKCE flow when first invoking a tool
4. ChatGPT exchanges authorization code for access token
5. Server verifies token on each request before executing tools

## Dynamic Client Registration (DCR)

Currently mandatory under MCP specs, DCR allows ChatGPT to register a fresh OAuth client per session. This generates numerous short-lived clients. The emerging **Client Metadata Documents (CMID)** proposal would let ChatGPT publish stable identity at a published URL, allowing authorization servers to pin the canonical client and enforce policies without per-session registration.

## Client Identification

"ChatGPT does **not** support machine-to-machine OAuth grants such as client credentials, service accounts, or JWT bearer assertions, nor can it present custom API keys or mTLS certificates." Currently, only network-level filtering via IP allowlists provides reliable client identification until CMID becomes available.

## Token Verification Requirements

MCP servers must assume all tokens are untrusted and perform full verification:

- Validate signature and issuer using published JWKS
- Confirm expiration and validity windows (`exp`/`nbf`)
- Verify token audience matches the server and contains required scopes
- Apply app-specific policy checks
- Return 401 with `WWW-Authenticate` challenge on failure

Both Python and TypeScript SDKs include helper functions for token verification.

## Triggering Authentication UI

ChatGPT surfaces OAuth linking UI only when two conditions are met:

1. **Resource metadata published** at the well-known endpoint
2. **Runtime errors include `_meta["mcp/www_authenticate"]`** with error and error_description parameters

Tools declare auth requirements using `securitySchemes` with either `noauth` (anonymous) or `oauth2` (scopes required). Servers can list both to indicate optional authentication unlocks additional features.

## Popular Identity Providers

Documented setup guides exist for:
- **Auth0**: Configuration for MCP authorization
- **Stytch**: Guides for MCP authorization and Apps SDK-specific implementation

## Testing Strategy

- Start with development tenants for quick iteration
- Gate access to trusted testers before broad rollout
- Plan for token revocation and refresh workflows
- Use MCP Inspector to debug OAuth flows step-by-step

---

**Source**: https://developers.openai.com/apps-sdk/build/auth
