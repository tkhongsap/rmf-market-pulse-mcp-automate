# App Developer Guidelines for ChatGPT

## Overview

OpenAI's guidelines establish baseline standards for ChatGPT apps, emphasizing trust, safety, and user respect. The framework distinguishes between minimum standards for directory listing and enhanced standards for better discoverability.

### Core App Characteristics
A successful ChatGPT app should:
- Deliver clear, meaningful value and enhance specific capabilities
- Protect user privacy through limited data collection
- Function reliably and predictably
- Maintain broad audience appropriateness
- Come from accountable, verified developers

## App Fundamentals

**Purpose and Originality**: Apps must have clear purposes, use only owned or licensed intellectual property, and avoid impersonation or misleading designs.

**Quality and Reliability**: Apps require thorough testing across scenarios. The guidelines state: "Apps that crash, hang, or show inconsistent behavior will be rejected." Beta submissions are not accepted.

**Metadata Standards**: Descriptions must be accurate and screenshots should demonstrate actual functionality. Tool titles should clarify whether operations are read-only or modify data.

**Authentication Requirements**: Login flows must be transparent, with permission requests strictly limited to functional necessity. Demo account credentials should accompany submissions.

## Safety Requirements

**Usage Policy Compliance**: Developers must follow OpenAI's usage policies and maintain ongoing compliance. Violations result in removal.

**Audience Appropriateness**: Apps must suit general audiences aged 13+, with mature content support pending future age verification systems.

**User Intent Respect**: Apps should directly address user requests without inserting unrelated content or collecting unnecessary data.

**Fair Competition**: The guidelines prohibit model-readable fields that discourage other app use or undermine fair discovery.

**Third-Party Integration**: Proper authorization from external services is mandatory; scraping, circumvention, and API restriction violations are prohibited.

## Privacy Standards

**Privacy Policy Requirement**: Clear, published policies explaining data collection and usage are mandatory. Users access these before installation.

**Data Minimization**: Collection should be narrowly scoped to functional necessity. The guidelines note: "Avoid 'just in case' fields or broad profile data."

**Sensitive Data Prohibition**: Payment information, health data, government identifiers, API keys, and passwords cannot be collected.

**Data Boundaries**:
- Location data should flow through controlled channels rather than raw input fields
- Apps cannot reconstruct or infer complete chat histories
- Operations must remain limited to explicitly shared content

**Transparency Requirements**: Behavioral profiling, tracking, and surveillance require explicit disclosure. Write operations must be labeled clearly, with destructive actions requiring confirmation friction.

**Data Exfiltration Prevention**: Actions sending data externally (messages, emails, file uploads) must appear as write operations requiring user confirmation.

## Developer Accountability

**Verification**: Verified identity and organizational affiliation are required. Misrepresentation results in program removal.

**Support Contacts**: Current customer support information must be maintained and accessible to end users.

**Review Process**: Automated scans and manual reviews assess policy compliance. Rejected apps receive feedback and appeal opportunities.

**Maintenance Standards**: Inactive, unstable, or non-compliant apps face removal without notice for legal, security, or policy reasons.

**Modification Requirements**: Tool names, signatures, and descriptions become locked upon listing. Changes require resubmission.

## Key Takeaway

These guidelines frame the ChatGPT app ecosystem as trust-based, requiring developers to prioritize user safety, privacy, and clear value delivery while maintaining transparent, accountable operations.

---

**Source**: https://developers.openai.com/apps-sdk/app-developer-guidelines
