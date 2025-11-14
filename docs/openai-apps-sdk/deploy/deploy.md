# Deploy Your App

## Overview
This guide covers deploying your MCP server and component bundle to production behind a stable HTTPS endpoint.

## Deployment Platform Options

The documentation recommends several hosting approaches:

**Managed Containers**: Services like Fly.io, Render, or Railway provide "quick spin-up and automatic TLS."

**Cloud Serverless**: Google Cloud Run or Azure Container Apps offer scale-to-zero capabilities, though the guide notes that "long cold starts can interrupt streaming HTTP."

**Kubernetes**: Suitable for teams with existing cluster infrastructure, requiring an ingress controller that supports server-sent events.

## Critical Requirements

Regardless of platform choice, ensure your `/mcp` endpoint:
- Remains responsive to requests
- Supports streaming responses
- Returns appropriate HTTP status codes for errors

## Local Development Workflow

Use ngrok or similar tunneling tools to expose your local server during development:
```
ngrok http 2091
# https://<subdomain>.ngrok.app/mcp → http://127.0.0.1:2091/mcp
```

After code changes, follow this sequence:
1. Rebuild the component bundle (`npm run build`)
2. Restart your MCP server
3. Refresh the connector in ChatGPT settings

## Environment Configuration Best Practices

**Secrets Management**: Store API keys and OAuth credentials using "platform-specific secret managers and inject them as environment variables."

**Logging**: Track tool-call IDs, request latency, and error details to support user troubleshooting.

**Observability**: Monitor CPU, memory, and request metrics for proper resource allocation.

## Pre-Production Testing

Before broad launch:
- Gate access via developer mode or feature flags
- Test discovery prompts documented during planning
- Capture screenshots and screen recordings for reference
- Verify authentication and storage configuration

## Next Steps

The guide directs readers to:
- [Connect from ChatGPT](/apps-sdk/deploy/connect-chatgpt) for endpoint integration
- [Test your integration](/apps-sdk/deploy/testing) for validation
- [Troubleshooting](/apps-sdk/deploy/troubleshooting) for operational support

---

**Source**: https://developers.openai.com/apps-sdk/deploy
