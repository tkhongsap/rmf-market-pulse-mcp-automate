# Testing Your Apps SDK Integration

## Overview
Testing validates connector behavior before user exposure, focusing on three critical areas: tool correctness, component UX, and discovery precision.

## Unit Testing Tool Handlers

Developers should exercise each tool function directly using representative inputs. Key priorities include:

- Validating schema compliance and error handling
- Testing edge cases like empty results or missing identifiers
- Automating authentication flow tests when tokens or account linking is involved
- Maintaining test fixtures alongside MCP code to ensure alignment as schemas evolve

## MCP Inspector for Development

The MCP Inspector provides the fastest local debugging approach:

1. Launch your MCP server
2. Run the inspector via command line
3. Enter your server URL (e.g., `http://127.0.0.1:2091/mcp`)
4. Use "List Tools" and "Call Tool" features to inspect raw requests/responses

As the documentation notes, "Inspector renders components inline and surfaces errors immediately."

## ChatGPT Developer Mode Validation

Once your connector is HTTPS-accessible:

- Link it through **Settings → Connectors → Developer mode**
- Activate it in test conversations
- Execute your golden prompt set (positive, indirect, and negative cases)
- Verify correct tool selection, argument passing, and confirmation behavior
- Test mobile layouts on ChatGPT iOS and Android apps

## API Playground Testing

For detailed logging without the full interface:

1. Access the API Playground
2. Select **Tools → Add → MCP Server**
3. Provide your HTTPS endpoint
4. Inspect JSON request/response pairs in the results panel

## Pre-Launch Regression Checklist

- Tool inventory matches documentation; unused prototypes removed
- Structured output aligns with declared `outputSchema` specifications
- Widgets render cleanly without console errors and restore state properly
- Auth flows return valid tokens and reject invalid credentials meaningfully
- Discovery functions correctly across golden prompts without false positives

Document all findings for release-to-release comparison and ongoing reliability.

---

**Source**: https://developers.openai.com/apps-sdk/deploy/testing
