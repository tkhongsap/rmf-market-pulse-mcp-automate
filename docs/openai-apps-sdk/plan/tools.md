# Define Tools - Apps SDK Documentation

## Overview

This guide helps developers plan and define tools for ChatGPT applications before implementation. Tools serve as the contract between MCP servers and language models, describing capabilities, inputs, and outputs.

## Core Principles

### Tool-First Thinking

Tools establish communication between your connector and the model. According to the documentation, "Good tool design makes discovery accurate, invocation reliable, and downstream UX predictable."

### Key Design Guidelines

**One job per tool** – Each tool should handle a single action (read or write), such as "fetch_board" or "create_ticket". This clarity helps models choose between options effectively.

**Explicit inputs** – Define input schema with parameter names, types, and enumerations. Document defaults and nullable fields so models understand optional elements.

**Predictable outputs** – Provide structured fields with machine-readable identifiers for downstream tool calls.

## Metadata for Discovery

Effective tool discovery requires capturing:

- **Name** – Action-oriented and unique identifiers (e.g., `kanban.move_task`)
- **Description** – Concise guidance starting with "Use this when…" to signal appropriate selection contexts
- **Parameter annotations** – Document each argument with safe ranges and enumerations
- **Global metadata** – App-level name, icon, and descriptions for directories

## Model-Side Considerations

**Authentication approach** – Determine if tools require pre-linking or work anonymously through onboarding flows.

**Read-only hints** – Mark non-mutating tools to allow ChatGPT to skip confirmation prompts.

**Result components** – Decide whether tools return components, JSON, or both.

## Implementation Workflow

Before coding, validate your tool set against captured user prompts to ensure coverage and eliminate ambiguities. This planning phase precedes the actual server setup and code development phases.

---

**Source**: https://developers.openai.com/apps-sdk/plan/tools
