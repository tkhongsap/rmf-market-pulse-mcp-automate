# App Design Guidelines

## Overview

Apps are developer-built experiences integrated into ChatGPT. They extend functionality through lightweight cards, carousels, fullscreen views, and other display modes while maintaining consistency with ChatGPT's interface.

**Resource**: Figma component library available for designers building on the platform.

## Best Practices

### Core Principles

The design framework emphasizes five key pillars:

- **Conversational**: Experiences should integrate seamlessly into ChatGPT's flow
- **Intelligent**: Tools demonstrate awareness of conversation context
- **Simple**: Each interaction focuses on a single clear outcome
- **Responsive**: Fast, lightweight tools that enhance rather than overwhelm
- **Accessible**: Support for users relying on assistive technologies

### Boundaries

"ChatGPT controls system-level elements such as voice, chrome, styles, navigation, and composer. Developers provide value by customizing content, brand presence, and actions inside the system framework."

This ensures native integration while allowing brand differentiation.

### Suitable Use Cases

Apps succeed when they:
- Fit naturally into conversation (booking, ordering, scheduling)
- Feature time-bound, action-oriented tasks
- Provide immediately valuable information
- Summarize visually and simply
- Extend ChatGPT additively

### Unsuitable Use Cases

Avoid apps that:
- Display long-form static content
- Require complex multi-step workflows
- Feature ads or irrelevant messaging
- Surface sensitive information in shared cards
- Duplicate ChatGPT's system functions

---

## Display Modes

### Inline

Appears directly in conversation flow, always before the model response. Every app initially appears inline.

**Components**:
- Icon and tool call label
- Lightweight embedded content
- Model-generated follow-up response

#### Inline Cards

Single-purpose widgets for quick confirmations and simple actions.

**Usage**: Single actions, small structured data, self-contained widgets

**Layout features**:
- Optional title for document-based content
- Expand button for fullscreen access
- "Show more" for additional items
- Inline edit controls
- Maximum two primary actions at bottom

**Interaction rules**:
- Edits persist automatically
- Support simple inline editing
- Dynamic layout expands to viewport height
- No nested scrolling
- No deep navigation within cards

**Restrictions**: "Limit primary actions per card... Support up to two actions maximum, with one primary CTA and one optional secondary CTA."

#### Inline Carousel

Multiple cards presented side-by-side for browsing similar options.

**Usage**: Small item lists (restaurants, playlists, events)

**Layout**:
- Mandatory images or visuals
- Titles for clarity
- Metadata (max two lines)
- Optional badges
- Single CTA per item

**Guidelines**: Keep 3-8 items, reduce metadata, maintain consistent visual hierarchy

### Fullscreen

Immersive experiences supporting multi-step workflows with the composer overlay.

**Usage**:
- Rich, irreducible tasks (explorable maps, editing canvases)
- Detailed content browsing

**Layout**:
- System close button
- Content area
- Native ChatGPT composer overlay

**Interaction**:
- Maintains chat context alongside the surface
- Composer indicates thinking state through shimmer effect
- Model responses display as truncated snippets above composer

**Key principle**: "Design your UX to work with the system composer. The composer is always present in fullscreen, so make sure your experience supports conversational prompts."

### Picture-in-Picture (PiP)

Persistent floating window for parallel activities like games or live sessions.

**Usage**: Parallel activities (games, collaboration), reactive widgets

**Behavior**:
- Remains fixed at viewport top on scroll
- Stays pinned until dismissal
- Returns to inline position when session ends

**Requirements**:
- PiP state updates with user interaction
- Auto-closes at session end
- No overloaded controls or static content

---

## Visual Design Guidelines

### Color

"System-defined palettes ensure actions and responses always feel consistent with ChatGPT."

**Rules**:
- Use system colors for text, icons, dividers
- Brand accents limited to logos and icons
- Avoid custom gradients
- Apply brand colors to primary buttons only

### Typography

"ChatGPT uses platform-native system fonts (SF Pro on iOS, Roboto on Android) to ensure readability and accessibility across devices."

**Rules**:
- Inherit system font stack
- Use partner styling only within content areas
- Minimize font size variation
- Never implement custom fonts

### Spacing & Layout

Consistent spacing maintains scannability.

**Rules**:
- Apply system grid spacing
- Maintain consistent padding
- Respect system corner radii
- Preserve clear visual hierarchy

### Icons & Imagery

**Rules**:
- Use system icons or monochromatic, outlined custom iconography
- Don't include partner logos in responses
- Maintain enforced aspect ratios

### Accessibility

"Every partner experience should be usable by the widest possible audience. Accessibility is a requirement, not an option."

**Requirements**:
- WCAG AA minimum contrast ratio
- Alt text for all images
- Support text resizing without layout breaks

---

## Tone & Proactivity

### Content Strategy

"ChatGPT sets the overall voice. Partners provide content within that framework."

**Guidelines**:
- Keep content concise and scannable
- Ensure context-driven responses
- Eliminate spam, jargon, promotional language
- Prioritize helpfulness over brand personality

### Proactivity Rules

**Permitted**: Contextual nudges tied to user intent (order status, arrival notifications)

**Prohibited**: Unsolicited promotions, upsells, re-engagement without context

### Transparency Requirement

"Always show why and when your tool is resurfacing. Provide enough context so users understand the purpose of the nudge."

Proactivity maintains user trust when integrated naturally into conversation rather than as interruptions.

---

**Source**: https://developers.openai.com/apps-sdk/concepts/design-guidelines
