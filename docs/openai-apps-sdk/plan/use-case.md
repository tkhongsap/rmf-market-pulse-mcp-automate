# Research Use Cases - Apps SDK Planning Guide

## Overview
This page guides developers through identifying and prioritizing use cases for Apps SDK applications before building tools or components.

## Key Sections

### Why Start with Use Cases
The foundation emphasizes that successful apps require understanding user goals. As stated: **"Discovery in ChatGPT is model-driven: the assistant chooses your app when your tool metadata, descriptions, and past usage align with the user's prompt"**

This understanding must precede technical implementation.

### Research Phase: Gather Inputs
Developers should collect three types of information:

- **User research**: Interviews and support tickets revealing jobs-to-be-done and current workflows
- **Prompt sampling**: Both explicit requests (e.g., "show my data") and indirect intents (e.g., "what's blocking progress?")
- **System constraints**: Compliance needs, offline data requirements, or rate limitations

Documentation should capture user personas, context, and success definitions for each scenario.

### Golden Prompt Sets
Testing requires creating evaluation prompts:

- **Direct prompts** (5+): Explicitly mention your product or expected terminology
- **Indirect prompts** (5+): Describe goals without naming the tool
- **Negative prompts**: Cases that should NOT trigger your app

This set enables measuring both recall and precision before full implementation.

### Minimum Lovable Feature Scope
For each use case, determine:

- Information required for inline display
- Which actions need write permissions and confirmation workflows
- Persistent state between conversation turns (filters, selections, drafts)

Rank use cases by impact and effort, typically shipping one priority scenario first.

### Translating to Tools
Define the tool contract covering inputs, outputs, and component intent (viewer, editor, or workspace).

### Iteration Planning
Expect revisions post-launch through weekly golden prompt reviews, user feedback collection, and analytics tracking of tool selection accuracy.

---

**Source**: https://developers.openai.com/apps-sdk/plan/use-case
