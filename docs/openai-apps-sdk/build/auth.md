# Authentication Guide for Apps SDK

## Overview

The Authentication page provides comprehensive guidance on securing Apps SDK applications through OAuth 2.1 implementation. It details how to authenticate users when exposing customer-specific data or write operations.

## Core Architecture

The authentication system consists of three components:

- **Resource server**: Your MCP server that exposes tools and validates access tokens
- **Authorization server**: Your identity provider (Auth0, Okta, Cognito, or custom)
- **Client**: ChatGPT acting on the user's behalf

## Key Requirements

Your MCP server must:

1. Host protected resource metadata at `/.well-known/oauth-protected-resource`
2. Return JSON describing your resource and authorization servers
3. Include required fields: `resource`, `authorization_servers`, `scopes_supported`

Your authorization server must expose OAuth discovery documents at standard endpoints, allowing ChatGPT to retrieve configuration for authorization, token exchange, and client registration.

## OAuth Flow Steps

1. ChatGPT queries your MCP server for protected resource metadata
2. ChatGPT registers via dynamic client registration and obtains a client_id
3. User invokes a tool; ChatGPT launches authorization code + PKCE flow
4. ChatGPT exchanges authorization code for access token
5. Server verifies token on each request before executing tools

## Token Verification

Your server must independently verify:

- Token signature and issuer using JWKS
- Expiration and validity windows
- Audience matches your server
- Required scopes are present
- Application-specific policies

Return `401 Unauthorized` with `WWW-Authenticate` header if verification fails.

## Declaring Authentication to Users

Use `securitySchemes` array on tools to signal authentication requirements:

- `noauth`: Callable anonymously
- `oauth2`: Requires access token with specified scopes

This allows mixed-auth servers where some tools remain anonymous while others require linking.

## Re-authorization Triggers

When tokens expire or lack necessary scopes, respond with `mcp/www_authenticate` metadata. This signals ChatGPT to re-run the OAuth flow without requiring manual user intervention.

## Identity Providers

The guide recommends established providers like Auth0 and Stytch, which support PKCE and dynamic client registration needed for compliance with MCP authorization specifications.

---

**Source**: https://developers.openai.com/apps-sdk/build/auth
