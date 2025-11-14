# Apps SDK Use Case Planning Guide

## Overview
The Apps SDK documentation emphasizes starting with user-focused use case research before building tools or components. Discovery in ChatGPT is "model-driven: the assistant chooses your app when your tool metadata, descriptions, and past usage align with the user's prompt."

## Research Phase

**Gather foundational inputs:**
- User interviews and support channels to understand jobs-to-be-done and current workflows
- Prompt sampling capturing both explicit requests ("show my board") and implicit goals ("keep tasks organized")
- System constraints including compliance, offline requirements, and rate limits

Document each scenario with: user persona, context when reaching for ChatGPT, and one-sentence success definition.

## Evaluation Prompts

Develop a "golden set" for testing:
- **5+ direct prompts** explicitly naming your product or expected actions
- **5+ indirect prompts** stating goals without specifying the tool
- **Negative prompts** to measure precision and prevent false triggering

These prompts support later metadata optimization without overfitting.

## Scope Definition

For each use case, determine:
- What information displays inline for user action
- Which operations require write access and confirmation gating
- What state persists between conversation turns (filters, drafts, selections)

Prioritize based on user impact and implementation difficulty, typically shipping one high-confidence P0 scenario first.

## Tool Translation

Convert validated use cases into tool specifications:
- **Inputs:** explicit, constrained parameters with documented defaults
- **Outputs:** structured data including IDs, timestamps, and status alongside UI content
- **Component intent:** read-only viewer, editor, or multiturn workspace

Obtain stakeholder and compliance review before implementation.

## Iteration Planning

Schedule ongoing refinement including weekly prompt accuracy tracking, dogfood feedback collection, and analytics capture to measure adoption and tool selection accuracy.
