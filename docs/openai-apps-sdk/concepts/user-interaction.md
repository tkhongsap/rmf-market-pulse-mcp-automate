# User Interaction in ChatGPT Apps SDK

## Overview

The User Interaction page explains how users discover, engage with, and manage apps within ChatGPT through three main mechanisms: discovery, engagement, and activation.

## Discovery Methods

**Named Mention**: Users can explicitly reference an app by name at the start of their prompt, automatically surfacing the tool in responses.

**In-Conversation Discovery**: The model evaluates multiple signals including:
- Chat history and prior tool results
- Brand mentions in queries or search citations
- Tool metadata (names, descriptions, parameters)
- User's existing app connections

According to the documentation, developers should "write action-oriented tool descriptions" rather than generic copy to improve discoverability. For example: "Use this when the user wants to view their kanban board."

**Directory Listing**: A browsable surface outside conversations displaying app name, icon, descriptions, tags, and onboarding materials.

## Entry Points

**In-Conversation Access**: Linked tools remain active in the model's context. The assistant determines whether to invoke your tool based on conversation state and supplied metadata. Returns should include "structured content that references stable IDs" for follow-up interactions.

**Launcher Integration**: The composer's + button provides explicit app selection, supporting deep linking with starter prompts and context-aware ranking based on conversation signals.

## Key Best Practices

Developers should maintain clear, action-focused metadata, provide structured responses with stable identifiers, and regularly test prompt scenarios to optimize precision and recall metrics.

---

**Source**: https://developers.openai.com/apps-sdk/concepts/user-interaction
