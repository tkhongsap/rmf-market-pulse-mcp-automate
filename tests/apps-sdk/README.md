# MCP Inspector Testing

This directory contains testing scripts and guides for validating OpenAI Apps SDK compliance using MCP Inspector.

## Files

- `test-mcp-inspector.sh` - Launches MCP Inspector with server connection
- `test-mcp-inspector-execution.sh` - Pre-test verification and test execution guide
- `test-apps-sdk-compliance.sh` - Automated compliance tests (22 tests)
- `MCP_INSPECTOR_TESTING_GUIDE.md` - Quick reference testing guide
- `results/` - Test results and screenshots directory

## Quick Start

```bash
# 1. Run pre-test verification (automated)
./tests/apps-sdk/test-mcp-inspector-execution.sh

# 2. Launch MCP Inspector (opens browser)
./tests/apps-sdk/test-mcp-inspector.sh
```

## Testing Phases

1. **Pre-Test Verification** ✅ Automated
   - Branch check
   - Database check
   - Compliance tests
   - TypeScript compilation
   - Server verification
   - Resource registration

2. **MCP Inspector Launch** 🔄 Manual
   - Connect to server
   - Verify tools/resources visible

3. **Tool-by-Tool Testing** 🔄 Manual
   - Test all 6 tools
   - Verify all 4 widgets render

4. **State Persistence** 🔄 Manual
   - Test widget state persistence

5. **Theme & Display Mode** 🔄 Manual
   - Test theme switching
   - Test display mode changes

6. **Error Handling** 🔄 Manual
   - Test error scenarios

7. **Performance** 🔄 Manual
   - Measure load times

8. **Documentation** 🔄 Manual
   - Document results
   - Capture screenshots

## Test Results

Results are saved in `results/mcp-inspector-test-*.md` with timestamps.

## Success Criteria

✅ All 6 tools execute successfully
✅ All 4 widgets render correctly
✅ State persists across sessions
✅ Theme switching works
✅ Display modes work
✅ No console errors
✅ Performance acceptable

## Troubleshooting

See `MCP_INSPECTOR_TESTING_GUIDE.md` for detailed troubleshooting steps.
