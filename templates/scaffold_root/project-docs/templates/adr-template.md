---
docType: template
version: 1.1.0
lastUpdated: [YYYY-MM-DD] # Date this template file was last changed. User updates this in their ADR instance.

# ─── Architecture Decision Record (ADR) Front-matter ───
adrId: ADR-[NNN]                 # Unique identifier (e.g., ADR-001)
title: "[Short, Descriptive Title of the Decision]"
status: proposed                 # proposed | accepted | deprecated | superseded
date: [YYYY-MM-DD]               # Date of last status change or when decision was made
authors:
  - [Author Name <email@example.com>]
  - [Another Author Name <email@example.com>]
# Optional: if this ADR supersedes another
supersedes: ADR-[MMM]
# Optional: if this ADR is superseded by another
supersededBy: ADR-[PPP]
# Git commit hash from the main branch *before* this ADR's changes are implemented.
# To be filled upon ADR 'accepted' status, before work begins.
lastGitCommitBeforeAdoption: "[commit-hash]"
tags: [[architecture], [decision], [e.g., database], [refactor]]
---

# ADR-[NNN]: [Short, Descriptive Title of the Decision]

**Status:** `[proposed | accepted | deprecated | superseded]`
**Date:** `[YYYY-MM-DD]`
_ (This date reflects when the ADR's status last changed or decision was made for the specific ADR instance.)_
**Authors:** `[List of Authors]`
**Last Git Commit Before Adoption:** `[commit-hash (fill when 'accepted')]`

## 1 · Context & Problem Statement
*   **What is the issue, problem, or opportunity we are addressing?**
    *   [Describe the context clearly. What are the driving forces, constraints, user needs, or technical challenges?]
*   **What are the current limitations or pain points?**
    *   [Explain why a decision is needed now.]
*   **Relevant Background:**
    *   [Link to relevant SPPG sections: e.g., `SPPG.md#section-on-scalability`]
    *   [Link to related Mini-PRDs: e.g., `PRD-042`, `PRD-045`]
    *   [Other relevant documents or previous discussions.]

## 2 · Current State (Before This Decision)
*   _Describe the relevant parts of the system, architecture, process, or file structures as they exist **before** this decision is implemented._
*   _Be specific. Use diagrams (e.g., Mermaid), code snippets, or file paths if they help clarify the "before" picture._
    *   Example: "Currently, user authentication is handled by a monolithic `AuthService` class located at `src/services/AuthService.ts`. All user data is stored in a single PostgreSQL table named `users`."

## 3 · Proposed Decision
*   **We will:** _[State the decision clearly and affirmatively. Be specific about what will be done, adopted, or changed.]_
    *   Example: "We will refactor the `AuthService` into microservices: `UserManagementService` and `TokenValidationService`."
    *   Example: "We will adopt GraphQL as the primary API query language for client-facing applications."
    *   Example: "We will migrate from [Old Technology] to [New Technology] for [Specific Purpose]."

## 4 · Proposed State (After This Decision)
*   _Describe the relevant parts of the system, architecture, process, or file structures as they will exist **after** this decision is implemented._
*   _Highlight the key changes from the "Current State." Use diagrams, new file structures, or API definitions if applicable._
    *   Example: "The `UserManagementService` will handle user creation, updates, and profile data, exposing a REST API. The `TokenValidationService` will issue and validate JWTs. User data will be split into `user_profiles` and `user_credentials` tables."

## 5 · Rationale / Justification
*   **Why was this decision chosen?**
    *   [Explain the main reasons, supported by evidence or arguments.]
*   **How does this decision align with our goals/principles?**
    *   [e.g., North Star, SPPG, technical strategy, team skills.]
*   **Expected benefits:**
    *   [Benefit 1, Benefit 2...]
*   **Why this solution over alternatives?**
    *   [Briefly touch upon why other considered options were not chosen (detailed in Section 7).]

## 6 · Consequences & Implications
*   **Positive Consequences:**
    *   [List the anticipated positive outcomes, improvements, or new capabilities.]
*   **Negative Consequences / Trade-offs:**
    *   [List any drawbacks, complexities, costs, or limitations introduced by this decision.]
*   **Risks and Mitigation:**
    *   **Risk 1:** [Description of risk, e.g., "Increased operational complexity due to more services."]
        *   **Likelihood:** [Low | Medium | High]
        *   **Impact:** [Low | Medium | High]
        *   **Mitigation:** [How to address or reduce this risk, e.g., "Implement standardized monitoring and deployment pipelines."]
    *   **Risk 2:** [Description of risk]
        *   **Likelihood:** [...] **Impact:** [...]
        *   **Mitigation:** [...]
*   **Watchouts / Important Considerations:**
    *   [Any specific things the team needs to be aware of during or after implementation.]

## 7 · Alternatives Considered
*   **Alternative A: [Name/Description of Alternative 1]**
    *   **Description:** [Briefly explain the alternative.]
    *   **Pros:** [Advantages of this alternative.]
    *   **Cons:** [Disadvantages or reasons why it was not chosen.]
    *   **Reason for Rejection:** [Specific reason it was not selected.]
*   **Alternative B: [Name/Description of Alternative 2]**
    *   **Description:** [...]
    *   **Pros:** [...]
    *   **Cons:** [...]
    *   **Reason for Rejection:** [...]
*   **(Optional) Alternative C: Do Nothing / Status Quo**
    *   **Description:** Maintain the current state.
    *   **Pros:** [e.g., No immediate effort, no new risks introduced by change.]
    *   **Cons:** [e.g., Existing problems persist, missed opportunity.]
    *   **Reason for Rejection:** [Why maintaining the status quo is not acceptable.]

## 8 · Affected Components & Scope
*   **Affected Systems/Modules:**
    *   [List all systems, microservices, libraries, or major application modules impacted by this change.]
*   **Affected Features (Mini-PRDs):**
    *   [List relevant Mini-PRD numbers/names and links, e.g., `PRD-010 - User Login`, `PRD-025 - Profile Management`.]
*   **Affected Files/Code (High-Level or Key Areas):**
    *   [Describe general areas of the codebase, key files/directories if known, or types of changes expected.]
    *   [e.g., "All controllers interacting with the old AuthService.", "Database schema migrations for `users` table."]
*   **Impact on Other Documentation:**
    *   **SPPG:** [Not Impacted | Requires Update (Section X)] - [Link/Details]
    *   **Service Docs:** [e.g., `Auth Service Curated Docs` requires major revision] - [Link/Details]
    *   **Mini-PRDs:** [e.g., PRD-010, PRD-025 will need updates to dependencies/scope]
    *   **Onboarding Materials:** [Not Impacted | Requires Update]
    *   **Other:** [Specify]

## 9 · Implementation Plan (High-Level)
*   **Key Steps / Phases:**
    1. [e.g., Design new service APIs.]
    2. [e.g., Implement `UserManagementService`.]
    3. [e.g., Data migration script development and testing.]
    4. [e.g., Phased rollout to internal users.]
*   **Dependencies for Implementation:**
    *   [e.g., Availability of new infrastructure, team member expertise.]
*   **Estimated Effort/Timeline (Optional):** [e.g., Small/Medium/Large, or specific timeframe.]
*   **Rollback Plan (If Applicable):** [Briefly outline how the changes could be reverted if major issues arise.]

## 10 · Validation & Verification
*   **How will we confirm the decision is implemented correctly?**
    *   [e.g., Unit tests, integration tests for new services, successful data migration.]
*   **How will we measure its success or impact?**
    *   [Refer to specific metrics, e.g., "Reduced auth latency by 20%", "Improved developer onboarding time for auth features."]

## 11 · Discussion & Review Log (Optional)
*   **Date:** [YYYY-MM-DD] - **Event:** [e.g., Initial proposal discussion with X, Y, Z] - **Summary:** [Key points discussed, feedback received.]
*   **Date:** [YYYY-MM-DD] - **Event:** [e.g., Architectural review board approval]

---

**Related Docs →** [SPPG](../templates/systemic-principles-template.md) · [North Star](../templates/north-star-template.md) · [Playbook](../playbook.md) · [PRDs](../prds/) · [Service Docs](../references/)