# Authentication Documentation

## Overview

The Apps SDK authentication guide covers OAuth 2.1 implementation for securing MCP (Model Context Protocol) servers that handle user-specific data or write operations.

## Key Components

**Three-party architecture:**
- **Resource server**: Your MCP server that exposes tools and validates access tokens
- **Authorization server**: Identity provider (Auth0, Okta, Cognito, custom) issuing tokens
- **Client**: ChatGPT acting on the user's behalf with PKCE support

## MCP Authorization Spec Requirements

### 1. Host Protected Resource Metadata

Your MCP server must provide an HTTPS endpoint (e.g., `GET https://your-mcp.example.com/.well-known/oauth-protected-resource`) returning:

```json
{
  "resource": "https://your-mcp.example.com",
  "authorization_servers": ["https://auth.yourcompany.com"],
  "scopes_supported": ["files:read", "files:write"],
  "resource_documentation": "https://yourcompany.com/docs/mcp"
}
```

Critical fields include the canonical resource identifier, authorization server URLs, and supported scopes.

### 2. Publish OAuth Metadata

Identity providers must expose discovery documents at standard locations:
- `https://auth.yourcompany.com/.well-known/oauth-authorization-server`
- `https://auth.yourcompany.com/.well-known/openid-configuration`

Essential response fields:
- `authorization_endpoint`, `token_endpoint`, `jwks_uri`
- `registration_endpoint` for dynamic client registration
- `code_challenge_methods_supported`: must include `S256`

### 3. Echo Resource Parameter

ChatGPT appends `resource=https%3A%2F%2Fyour-mcp.example.com` to authorization and token requests. Configure your server to copy this into access tokens (typically the `aud` claim) for verification.

### 4. PKCE Support

ChatGPT uses authorization-code flow with `S256` code challenge. Your metadata must advertise this capability.

## OAuth Flow Steps

1. ChatGPT queries your MCP server for protected resource metadata
2. ChatGPT registers via dynamic client registration, obtaining a `client_id`
3. User authenticates and consents to requested scopes
4. ChatGPT exchanges authorization code for access token
5. Your server verifies token on each request before executing tools

## Token Verification Requirements

Your MCP server must perform complete resource-server validation:

- Fetch signing keys from authorization server (typically JWKS) and verify signature and issuer (`iss`)
- Reject expired or not-yet-valid tokens (`exp`/`nbf`)
- Confirm token audience matches your server (`aud` or `resource` claim)
- Validate required scopes
- Return `401 Unauthorized` with `WWW-Authenticate` header on verification failure

## Triggering Authentication UI

### Declare OAuth Upfront

Use `securitySchemes` array on tools to signal authentication requirements:

```typescript
securitySchemes: [
  { type: "noauth" },
  { type: "oauth2", scopes: ["search.read"] }
]
```

Options:
- `noauth`: callable anonymously
- `oauth2`: requires access token with specified scopes

### Runtime Re-authentication

When tokens expire or lack required scopes, respond with `mcp/www_authenticate` metadata:

```typescript
throw new ToolError("Authentication required", {
  _meta: {
    "mcp/www_authenticate":
      'Bearer resource_metadata="https://your-mcp.example.com/.well-known/oauth-protected-resource", scope="files:read"'
  },
});
```

## Recommended Providers

Popular OAuth 2.1 providers with MCP support include:
- **Auth0**: Documented configuration guidance available
- **Stytch**: Comprehensive MCP-specific guides and Apps SDK integration documentation

## Client Identification Limitations

ChatGPT currently cannot present machine-to-machine OAuth grants, custom API keys, or mTLS certificates. Network-level filtering (allowlisting egress IPs) remains the most reliable control method. The emerging Client Metadata Documents (CMID) standard will address this limitation once finalized.

## Testing & Rollout Strategy

- Start with development tenants using short-lived tokens
- Gate access to trusted testers before broad rollout
- Plan for token revocation, refresh, and scope changes
- Use MCP Inspector to debug OAuth flows before deployment
