# User Interaction Documentation

## Overview
The User Interaction section explains how users discover, engage with, and manage apps within ChatGPT through various mechanisms.

## Discovery Methods

### Named Mention
Users can surface your app by specifying its name at the prompt's start, triggering automatic display in responses.

### In-Conversation Discovery
The model evaluates multiple signals including:
- Chat history and prior tool results
- Brand mentions and citations in search results
- Tool metadata (names, descriptions, parameters)
- User account linking status

The documentation recommends crafting "action-oriented tool descriptions" rather than generic copy, and maintaining clear component descriptions in resource UI templates.

### Directory Listing
Apps appear in a browsable directory featuring name, icon, descriptions, tags, and optional onboarding materials.

## Entry Points

### In-Conversation Access
Linked tools remain available in the model's context. The assistant determines tool usage based on conversation state and supplied metadata. Best practices include structured content returns with stable IDs for follow-up modifications.

### Launcher Integration
Accessible via the composer's plus button, this high-intent surface allows explicit app selection. Features include:
- Deep linking with starter prompts
- Context-aware ranking using conversation signals
- Succinct labels and icons

The documentation emphasizes metadata alignment with supported scenarios and maintaining "action-oriented" descriptions for effective model disambiguation.
