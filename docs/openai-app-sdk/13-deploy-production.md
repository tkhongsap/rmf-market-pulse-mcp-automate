# Deployment Documentation for Apps SDK

## Overview
This guide covers deployment requirements and strategies for hosting OpenAI Apps SDK applications in production.

## Hosting Platforms

The documentation identifies three categories of suitable deployment environments:

1. **Managed Containers** – "Fly.io, Render, or Railway for quick spin-up and automatic TLS"
2. **Cloud Serverless** – Google Cloud Run or Azure Container Apps, though "long cold starts can interrupt streaming HTTP"
3. **Kubernetes** – recommended for teams with existing cluster infrastructure, requiring an ingress controller that supports server-sent events

## Critical Requirements

Your deployment must satisfy these conditions:
- Host behind a stable HTTPS endpoint
- Keep the `/mcp` route responsive with streaming response support
- Return appropriate HTTP status codes for errors

## Local Development Workflow

During iteration, use tunneling services like ngrok to expose localhost. The development cycle involves:

1. Rebuilding the component bundle (`npm run build`)
2. Restarting the MCP server
3. Refreshing connector settings in ChatGPT to fetch updated metadata

## Production Readiness

Before launching broadly, the guide recommends:

- Gating access through developer mode or feature flags
- Testing with "golden prompts" drafted during planning phases
- Capturing visual documentation (screenshots/recordings) of the component in action
- Configuring secrets via platform-specific managers as environment variables
- Implementing logging for tool-call IDs, latency, and error payloads

The documentation emphasizes monitoring CPU, memory, and request metrics to ensure proper resource allocation.

## Deployment Checklist

### Pre-Deployment
- [ ] HTTPS endpoint configured and accessible
- [ ] `/mcp` route returns valid responses
- [ ] Component bundle built and optimized
- [ ] Environment variables configured
- [ ] Secrets managed securely
- [ ] Logging and monitoring enabled

### Testing
- [ ] MCP Inspector validation passed
- [ ] Developer mode testing completed
- [ ] Golden prompts validated
- [ ] Mobile layouts verified
- [ ] Performance benchmarks met

### Production
- [ ] Feature flags or access controls configured
- [ ] Error tracking enabled
- [ ] Resource monitoring active
- [ ] Documentation updated
- [ ] Rollback plan prepared

## Platform-Specific Considerations

**Managed Containers (Fly.io, Render, Railway):**
- Easiest setup with automatic TLS
- Good for small to medium traffic
- Built-in scaling capabilities

**Cloud Serverless (Cloud Run, Container Apps):**
- Cost-effective for variable traffic
- Watch for cold start latency
- Ensure streaming HTTP support

**Kubernetes:**
- Best for existing K8s infrastructure
- Requires ingress controller configuration
- Full control over scaling and resources

## Monitoring and Maintenance

**Key Metrics to Track:**
- Request latency and throughput
- Error rates by tool and endpoint
- Component render times
- Authentication success rates
- Resource utilization (CPU, memory, network)

**Logging Best Practices:**
- Log tool-call IDs for debugging
- Track user journeys across requests
- Monitor API rate limits
- Capture structured error data
