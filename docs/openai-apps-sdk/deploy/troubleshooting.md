# Apps SDK Troubleshooting Guide

## Overview
The troubleshooting documentation provides a systematic approach to diagnosing and resolving issues across three primary layers: server, components, and ChatGPT client integration.

## Server-Side Issues

**Tool Discovery Problems**
- Verify the server is operational and connected to the `/mcp` endpoint
- "If you changed ports, update the connector URL and restart MCP Inspector"

**Component Rendering Failures**
- Confirm the tool response includes `_meta["openai/outputTemplate"]` pointing to a registered HTML resource
- Ensure the resource has `mimeType: "text/html+skybridge"`
- Check browser console for Content Security Policy violations

**Schema Validation Errors**
- Validate that Pydantic or TypeScript models align with advertised `outputSchema`
- Regenerate type definitions after schema modifications

**Performance Degradation**
- "Components feel sluggish when tool calls take longer than a few hundred milliseconds"
- Profile backend operations and implement caching strategies

## Widget Implementation Issues

**Loading Failures**
- Inspect browser console and MCP Inspector logs for CSP violations
- Verify compiled JavaScript is inlined within the HTML
- Confirm all dependencies are bundled

**State Persistence Problems**
- Call `window.openai.setWidgetState` following each state modification
- Rehydrate from `window.openai.widgetState` during component initialization

**Mobile Layout Issues**
- Inspect `window.openai.displayMode` and `window.openai.maxHeight` values
- Eliminate fixed heights and hover-dependent interactions

## Discovery and Tool Selection

**Tool Activation Problems**
- Revise metadata descriptions using "Use this when…" language patterns
- Update starter prompts and validate against established test cases

**Incorrect Tool Selection**
- Add distinguishing details to comparable tools
- Specify prohibited use cases in descriptions
- Consider fragmenting large tools into specialized components

## Authentication Challenges

**HTTP 401 Errors**
- Include `WWW-Authenticate` header in error responses to trigger OAuth reinitialization
- Validate issuer URLs and audience claim configurations

**Client Registration Failures**
- Confirm authorization server exposes `registration_endpoint`
- Verify newly created clients have login connections enabled

## Deployment Concerns

**Tunnel Timeouts**
- Restart ngrok and confirm local server operation before sharing URLs
- Use production-grade hosting with integrated health monitoring for stable deployments

**Streaming Disruptions**
- "Ensure your load balancer or CDN allows server-sent events or streaming HTTP responses without buffering"

## Escalation Protocol

When standard troubleshooting fails, compile:
- Server, component console, and tool call transcript logs
- Relevant screenshots
- Exact prompt issued and confirmation dialogs
- Contact your OpenAI partner representative with compiled details

---

**Source**: https://developers.openai.com/apps-sdk/deploy/troubleshooting
