# Apps SDK Testing and Integration Guide

## Overview
The documentation outlines a comprehensive testing strategy focused on three core areas: tool correctness, component UX, and discovery precision.

## Testing Strategies

### Unit Testing Tool Handlers
Developers should "exercise each tool function directly with representative inputs" to verify schema validation, error handling, and edge cases. This includes testing scenarios with empty results and missing IDs. Authentication flows warrant automated testing if your connector issues tokens or requires user linking. Keep test fixtures near your MCP code to maintain synchronization as schemas change.

### MCP Inspector for Development
The fastest local debugging approach uses the MCP Inspector tool:

1. Start your MCP server
2. Launch inspector via: `npx @modelcontextprotocol/inspector@latest`
3. Enter your server URL (e.g., `http://127.0.0.1:2091/mcp`)
4. Use "List Tools" and "Call Tool" to examine raw requests/responses

The inspector "renders components inline and surfaces errors immediately," making it ideal for capturing evidence during development.

## Validation Methods

### ChatGPT Developer Mode Testing
Once your connector is HTTPS-accessible:
- Link it through Settings → Connectors → Developer mode
- Test your golden prompt set (direct, indirect, negative cases)
- Verify correct tool selection and argument passing
- Confirm confirmation prompts appear as designed
- Test mobile layouts on iOS and Android apps

### API Playground Testing
Access the [API Playground](https://platform.openai.com/playground) for raw logging:
1. Select Tools → Add → MCP Server
2. Provide your HTTPS endpoint
3. Issue test prompts and inspect JSON pairs in the right panel

## Pre-Launch Validation Checklist

- Tool list matches documentation; remove unused prototypes
- Structured content aligns with declared `outputSchema` for each tool
- Widgets render cleanly without console errors, self-contain styling, and preserve state
- Auth flows return valid tokens with meaningful error messages
- Discovery functions correctly across golden prompts without triggering on negative cases

Document findings to track consistency across releases and backend changes.

## Debugging Tips

**Common Issues:**
- Component not rendering: Check CSP configuration and resource URLs
- Tool not being called: Review tool descriptions and metadata
- State not persisting: Verify `setWidgetState()` implementation
- Authentication failures: Check token validation and OAuth flows

**Best Practices:**
- Use MCP Inspector first for rapid iteration
- Test on multiple devices (desktop, mobile)
- Validate with real user prompts, not just test cases
- Monitor error logs for production issues
