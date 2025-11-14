# App Design Guidelines for OpenAI Apps SDK

## Overview

Apps are developer-built experiences embedded within ChatGPT that extend functionality through lightweight cards, carousels, fullscreen views, and other integrated display modes. They maintain ChatGPT's clarity, trust, and conversational nature.

## Core Design Principles

The five foundational principles are:

1. **Conversational** – Experiences should feel like natural extensions of ChatGPT's interface
2. **Intelligent** – Tools should understand conversation context and anticipate user needs
3. **Simple** – Each interaction focuses on a single clear action or outcome
4. **Responsive** – Tools should feel fast and enhance rather than overwhelm conversation
5. **Accessible** – Designs must support users relying on assistive technologies

## Use Case Framework

### Good Use Cases
Apps work best for tasks that:
- Fit naturally into conversation (booking, ordering, scheduling)
- Are time-bound with clear endpoints
- Provide immediately actionable information
- Can be visually summarized simply with clear calls-to-action
- Add differentiated value to ChatGPT

### Poor Use Cases to Avoid
- Long-form or static content better suited for websites
- Complex multi-step workflows exceeding display constraints
- Advertisements or upsells
- Sensitive information visible to others
- Duplication of ChatGPT's built-in functions

## Display Modes

### Inline
Direct conversation flow integration featuring app name, icon, lightweight content, and model-generated follow-up suggestions.

**Inline Cards** – Single-purpose widgets with:
- Optional title for document-based content
- Expand buttons for rich media
- Maximum two primary actions
- No nested scrolling or deep navigation
- Dynamic height matching content up to viewport height

**Inline Carousels** – Side-by-side card sets with:
- 3-8 items for scannability
- Required images/visuals
- Two lines maximum of metadata
- Single optional CTA per item

### Fullscreen
Immersive experiences for complex tasks with retained ChatGPT composer overlay enabling continued conversation while users explore detailed content, maps, editing canvases, or interactive diagrams.

### Picture-in-Picture (PiP)
Persistent floating windows for parallel activities like games, live collaboration, or video sessions that remain visible during conversation and respond to chat input.

## Visual Design Standards

### Color Palette
- Use system-defined colors for text, icons, and structural elements
- Apply brand accent colors exclusively on primary buttons and badges
- Avoid custom gradients or background color modifications
- Preserve ChatGPT's minimal aesthetic

### Typography
- Inherit platform-native system fonts (SF Pro on iOS, Roboto on Android)
- Limit font size variation; prefer body and body-small sizes
- Reserve bold, italic, and highlights for content areas only
- Never implement custom fonts

### Spacing & Layout
- Apply consistent system grid spacing for all cards and collections
- Maintain adequate padding; avoid edge-to-edge text
- Respect system corner radius specifications
- Establish clear visual hierarchy with headline, supporting text, and CTA

### Icons & Imagery
- Use monochromatic, outlined system icons or custom iconography
- Never include logos as response elements (ChatGPT appends these)
- Enforce aspect ratios to prevent image distortion
- Provide alt text for all imagery

### Accessibility Requirements
- Maintain WCAG AA minimum contrast ratios
- Support text resizing without layout breakage
- Include comprehensive alt text

## Tone & Communication

**Tone Ownership Model:**
- ChatGPT establishes overall voice and conversational tone
- Partners provide contextual content within that framework
- Result should feel seamless and natural

**Content Principles:**
- Keep messaging concise and scannable
- Ground all content in user intent and conversation context
- Avoid jargon, promotional language, or spam
- Prioritize clarity and helpfulness

**Proactivity Guidelines:**
- Allowed: Context-driven nudges tied to user intent ("Your order is ready")
- Not allowed: Unsolicited promotions or re-engagement attempts
- Always show reasoning and context for resurfaces
- Maintain user control and system transparency

## Implementation Boundaries

ChatGPT controls system-level elements: voice, chrome, styling, navigation, and composer. Developers customize content, brand presence, and actions within this system framework, ensuring all apps feel native while expressing unique brand value.

---

**Resource**: [Figma component library](https://www.figma.com/community/file/1560064615791108827/apps-in-chatgpt-components-templates) available for design reference.
