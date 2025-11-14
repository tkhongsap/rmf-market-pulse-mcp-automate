# Optimize Metadata Guide

## Core Concept
Metadata directly influences ChatGPT's decisions about invoking your connector. Strategic naming, descriptions, and parameter documentation increase appropriate tool selection while minimizing unwanted activations.

## Key Phases

### 1. Establish Baseline Testing Data
Build a labeled dataset covering three prompt categories:
- **Explicit requests** – users directly mention your product
- **Implicit requests** – users describe desired outcomes without naming your tool
- **Out-of-scope requests** – situations where alternatives should handle the task

Document the correct behavior (invoke tool, skip it, or defer to competitors) for regression testing.

### 2. Craft Descriptive Metadata
Structure each tool's metadata strategically:
- **Name**: Combine domain and action (e.g., `calendar.create_event`)
- **Description**: Begin with "Use this when…" and explicitly state limitations
- **Parameters**: Include usage examples and enumerated options for constrained fields
- **Mutations**: Mark read-only operations with `readOnlyHint: true` to reduce confirmation friction

At the application level, provide polished descriptions, icons, and sample conversations showcasing primary use cases.

### 3. Test in Developer Mode
Systematically run your golden prompt set through ChatGPT and record:
- Tool selection accuracy
- Parameter assignments
- Component rendering success

Track precision (correct tool selection) and recall (tool invoked when appropriate).

### 4. Refine Iteratively
Modify one metadata element per cycle to isolate improvements. Maintain a revision log with timestamps and results. Prioritize precision on negative prompts before optimizing marginal gains.

### 5. Monitor Post-Launch
Track weekly analytics for tool-call patterns and confirmation request spikes, integrate user feedback into descriptions, and periodically replay baseline prompts—especially after adding tools or modifying structured fields.

---

**Source**: https://developers.openai.com/apps-sdk/guides/optimize-metadata
