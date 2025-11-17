# Production Testing Guide

Since the MCP server is already deployed at `https://alfie-app-tkhongsap.replit.app`, you can test directly against production **without needing ngrok or local server setup**.

## Advantages of Production Testing

✅ **No ngrok needed** - Server already has HTTPS
✅ **No local setup** - Test against real production environment  
✅ **ChatGPT ready** - Same URL used for ChatGPT integration
✅ **Real data** - Test with actual production database
✅ **Faster** - No need to start local server

## Testing Options

### Option 1: Test Production Directly (Recommended)

```bash
# Test MCP Inspector with production URL
MCP_ENDPOINT=https://alfie-app-tkhongsap.replit.app/mcp ./tests/apps-sdk/test-mcp-inspector.sh
```

Or simply:
```bash
./tests/apps-sdk/test-mcp-inspector.sh
```
(The script defaults to production URL)

### Option 2: Test Locally (For Development)

If you want to test local changes before deploying:

```bash
# Start local server
npm run dev

# In another terminal, test locally
MCP_ENDPOINT=http://localhost:5000/mcp ./tests/apps-sdk/test-mcp-inspector.sh
```

## MCP Inspector Testing

1. **Launch MCP Inspector**:
   ```bash
   ./tests/apps-sdk/test-mcp-inspector.sh
   ```

2. **Enter Production URL**:
   ```
   https://alfie-app-tkhongsap.replit.app/mcp
   ```

3. **Verify Connection**:
   - ✅ Connected status
   - ✅ 6 tools listed
   - ✅ 4 resources listed

4. **Test All Tools**:
   - Follow the testing guide in `MCP_INSPECTOR_TESTING_GUIDE.md`
   - All widgets should render correctly

## ChatGPT Developer Mode Testing

Since you have production HTTPS, you can connect ChatGPT directly:

1. **Open ChatGPT** → Settings → Connectors → Developer mode
2. **Add Connector**:
   ```
   https://alfie-app-tkhongsap.replit.app/mcp
   ```
3. **Test with Golden Prompts**:
   - "Show me the top 10 RMF funds by YTD performance"
   - "Get details for DAOL-GOLDRMF fund"
   - "Compare DAOL-GOLDRMF, ASP-DIGIBLOCRMF, and TGOLDRMF-A"

## When to Use Local vs Production

### Use Production When:
- ✅ Testing final implementation
- ✅ Validating ChatGPT integration
- ✅ Testing with real production data
- ✅ No code changes needed

### Use Local When:
- 🔧 Making code changes
- 🔧 Debugging issues
- 🔧 Testing new features
- 🔧 Need faster iteration

## No ngrok Needed!

Since your server is already deployed with HTTPS, you can skip:
- ❌ ngrok setup
- ❌ Local tunneling
- ❌ Port forwarding
- ❌ SSL certificate setup

Just use the production URL directly!

## Testing Checklist

- [ ] MCP Inspector connects to production URL
- [ ] All 6 tools execute successfully
- [ ] All 4 widgets render correctly
- [ ] ChatGPT Developer Mode connects
- [ ] Widgets display in ChatGPT interface
- [ ] No console errors
- [ ] Performance acceptable

---

**Production URL**: `https://alfie-app-tkhongsap.replit.app/mcp`
**Status**: ✅ Ready for testing

