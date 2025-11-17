# ChatGPT Integration Guide

This guide explains how to integrate the Thai RMF Market Pulse MCP server with ChatGPT using OpenAI Apps SDK.

## Prerequisites

- ✅ MCP server deployed and accessible via HTTPS
- ✅ Server running at: `https://alfie-app-tkhongsap.replit.app`
- ✅ All 6 tools implemented and tested
- ✅ All 4 widgets registered as MCP resources
- ✅ Apps SDK compliance verified

## Step 1: Enable ChatGPT Developer Mode

1. Open ChatGPT (web or desktop app)
2. Go to **Settings** → **Connectors** → **Developer mode**
3. Enable Developer Mode (if not already enabled)

## Step 2: Add MCP Connector

1. In ChatGPT Settings → Connectors, click **"Add Connector"** or **"Connect"**
2. Enter your MCP server endpoint:
   ```
   https://alfie-app-tkhongsap.replit.app/mcp
   ```
3. Click **"Connect"** or **"Save"**

## Step 3: Verify Connection

ChatGPT will automatically:
- Discover available tools (6 tools)
- List registered resources (4 widgets)
- Validate the MCP server configuration

You should see:
- ✅ Connection status: Connected
- ✅ Tools: 6 available
- ✅ Resources: 4 available

## Step 4: Test with Golden Prompts

Try these example prompts to test each tool:

### Fund List
```
Show me the top 10 RMF funds by YTD performance
```

### Fund Search
```
Find all gold-related equity RMF funds
```

### Fund Detail
```
Get detailed information about DAOL-GOLDRMF fund
```

### Fund Performance
```
Show me the top 5 performing RMF funds for 1 year period
```

### NAV History
```
Show me the NAV history for DAOL-GOLDRMF over the last 30 days
```

### Fund Comparison
```
Compare DAOL-GOLDRMF, ASP-DIGIBLOCRMF, and TGOLDRMF-A funds
```

## Step 5: Verify Widget Rendering

For each tool call, verify:

1. **Widget Renders**: The widget should appear inline in the ChatGPT conversation
2. **Data Display**: Fund data should be visible and formatted correctly
3. **Theme Support**: Widget adapts to ChatGPT's light/dark theme
4. **State Persistence**: Widget state persists when reopening the same message
5. **No Console Errors**: Check browser console (F12) for any JavaScript errors

## Troubleshooting

### Connection Issues

**Problem**: ChatGPT cannot connect to MCP server

**Solutions**:
- Verify server is accessible: `curl https://alfie-app-tkhongsap.replit.app/mcp`
- Check CORS headers allow ChatGPT domains
- Ensure HTTPS is properly configured
- Verify server logs for connection attempts

### Widget Not Rendering

**Problem**: Tool executes but widget doesn't appear

**Solutions**:
- Verify resource is registered: Check `resources/list` endpoint
- Check `_meta['openai/outputTemplate']` matches resource URI
- Verify widget HTML is valid and accessible
- Check browser console for CSP or CORS errors
- Ensure `mimeType: "text/html+skybridge"` is set correctly

### Widget Errors

**Problem**: Widget renders but shows errors

**Solutions**:
- Check browser console for JavaScript errors
- Verify `window.openai` API is available
- Ensure data structure matches widget expectations
- Check `structuredContent` and `_meta` fields are present

### Theme/Display Mode Issues

**Problem**: Widget doesn't adapt to theme or display mode

**Solutions**:
- Verify widget listens to `openai:set_globals` event
- Check `window.openai.theme` and `window.openai.displayMode` are read
- Ensure CSS adapts to theme classes

## Testing Checklist

Before deploying to production:

- [ ] All 6 tools execute successfully
- [ ] All 4 widgets render correctly
- [ ] Widgets display data accurately
- [ ] Theme switching works (light/dark)
- [ ] Display mode transitions work (inline/fullscreen)
- [ ] Widget state persists across sessions
- [ ] No console errors in browser
- [ ] Mobile layout works correctly
- [ ] Performance is acceptable (< 2s response time)

## Advanced Configuration

### Custom Domain

If deploying to a custom domain, update:

1. `server/mcp.ts` - Update `baseUrl` in `setupResources()`
2. `server/mcp.ts` - Update CSP `connect_domains` in resource metadata
3. Environment variables - Set `REPLIT_DOMAINS` or update hardcoded URLs

### Authentication (Future)

For OAuth 2.1 integration:

1. Add `/.well-known/oauth-protected-resource` endpoint
2. Configure `securitySchemes` in tool definitions
3. Implement token verification in tool handlers
4. Update resource metadata with auth requirements

See `docs/openai-app-sdk/10-build-auth.md` for details.

## Monitoring

### Server Health

Monitor these endpoints:

- `GET /healthz` - Server health and fund count
- `GET /` - Server information and available tools

### Logs

Check server logs for:
- Tool invocation counts
- Error rates
- Response times
- Resource fetch requests

## Support

For issues or questions:

1. Check server logs: `/tmp/mcp-server.log` (if running locally)
2. Test with MCP Inspector: `npm run test:mcp-inspector`
3. Run compliance tests: `./tests/apps-sdk/test-apps-sdk-compliance.sh`
4. Review documentation: `docs/openai-app-sdk/`

## Next Steps

After successful integration:

1. **User Testing**: Gather feedback from beta users
2. **Performance Optimization**: Monitor and optimize slow queries
3. **Feature Enhancements**: Add more interactive widgets
4. **Analytics**: Track tool usage and popular queries
5. **Documentation**: Create user-facing documentation

---

**Last Updated**: 2025-11-17
**Server Version**: v1.0.0
**MCP Protocol**: 2025-06-18

