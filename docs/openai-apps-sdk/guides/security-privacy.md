# Security & Privacy Guide for Apps SDK

## Core Principles

The guide establishes three foundational practices for secure app development:

1. **Least Privilege** – "only request the scopes, storage access, and network permissions you need."
2. **Explicit User Consent** – developers should ensure transparency when users link accounts or authorize write operations, utilizing ChatGPT's built-in confirmation mechanisms
3. **Defense in Depth** – assume malicious inputs will occur and implement comprehensive validation and audit logging

## Data Handling Requirements

Apps should implement careful data governance practices:

- **Minimal Data Transfer** – "include only the data required for the current prompt. Avoid embedding secrets or tokens in component props."
- **Retention Policies** – establish and communicate how long user information persists
- **Logging Standards** – "redact PII before writing to logs. Store correlation IDs for debugging but avoid storing raw prompt text unless necessary."

## Mitigating Prompt Injection Risks

Given developer mode enables full MCP access with write capabilities, recommended protections include:

- Regular review of tool descriptions to discourage misuse
- Server-side validation of all inputs regardless of model-provided data
- Mandatory human confirmation for irreversible operations

## Network and Browser Constraints

Widgets operate within a sandboxed iframe with strict Content Security Policy restrictions, preventing access to sensitive browser APIs like `window.alert` and `navigator.clipboard`. Standard fetch requests require CSP compliance.

## Authentication Best Practices

- Implement OAuth 2.1 with PKCE and dynamic client registration for external integrations
- Verify scope enforcement on each tool invocation
- Reject invalid or expired tokens with appropriate HTTP responses

## Operational Readiness

Before launch, organizations should conduct security reviews, establish monitoring for suspicious activity, and maintain current dependencies.

---

**Source**: https://developers.openai.com/apps-sdk/guides/security-privacy
