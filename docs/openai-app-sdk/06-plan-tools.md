# Defining Tools in Apps SDK

## Core Principles

The documentation emphasizes **tool-first thinking** as fundamental to Apps SDK development. Tools function as the contract between your MCP server and the language model, describing capabilities, invocation methods, and return data structures.

## Key Planning Steps

### 1. Draft Tool Surface Area
- **Single responsibility**: Each tool should handle one read or write action (e.g., `fetch_board`, `create_ticket`) rather than combining multiple functions
- **Explicit inputs**: Define `inputSchema` with parameter names, data types, and enums upfront
- **Predictable outputs**: Structure return fields to include machine-readable identifiers for chaining subsequent calls
- **Separate read/write tools**: Create distinct tools for different operation types to enable proper confirmation workflows

### 2. Metadata Capture for Discovery
Essential metadata includes:

- **Name**: Action-oriented, unique within your connector
- **Description**: "Use this when…" framing helps models understand appropriate contexts
- **Parameter annotations**: Document safe ranges, enumerations, and defaults
- **Global metadata**: App-level name, icon, and descriptions for directory visibility

### 3. Model-Side Guardrails

The documentation recommends considering:

- **Authentication states**: Determine whether tools work anonymously or require linking
- **Read-only hints**: Use `readOnlyHint` annotations to skip confirmation prompts for non-mutating operations
- **Output rendering**: Decide between component rendering, JSON returns, or hybrid approaches via `_meta["openai/outputTemplate"]`

### 4. Validation Strategy

Before implementation, validate your tool definitions against:
- Direct user prompts (one tool per request)
- Indirect prompts (sufficient metadata for model selection)
- Negative prompts (proper metadata prevents unintended invocation)

## Implementation Handoff

Document these elements before coding:
- Tool name, description, input/output schemas
- Component rendering requirements
- Authentication and rate-limit specifications
- Test cases (success and failure scenarios)
