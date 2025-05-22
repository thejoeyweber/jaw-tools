---
docType: template
version: 1.1.0
lastUpdated: [YYYY-MM-DD] # Date this template file was last changed. User updates this in their specific integration-doc instance.

# ─── Curated Integration Docs Front-matter ───
serviceA: [Name of Service A]
serviceB: [Name of Service B]
integrationType: [e.g., API, Webhook, SDK-to-SDK, Data Sync]
primaryDocumentationUrl: [Official doc URL for this specific integration, if one exists]
sourceUrls: # List of key official documentation pages or resources for the integration
  - url: [URL to specific doc page 1]
    description: [Brief note, e.g., "Service A to Service B Auth Guide"]
  - url: [URL to specific doc page 2]
    description: [Brief note, e.g., "Webhook setup for Service B"]
relatedServiceDocs:
  - docPath: /_docs/services/[service-A-doc-filename].md # Path to Curated Docs for Service A
    serviceName: [Service A]
  - docPath: /_docs/services/[service-B-doc-filename].md # Path to Curated Docs for Service B
    serviceName: [Service B]
tags: [[integration], [serviceA-name], [serviceB-name]]
---

# Curated Integration Docs – [Service A] × [Service B]

> **Purpose:** To document the specifics of integrating **[Service A]** with **[Service B]** in our project. This includes verbatim, cited setup steps, best practices, data flow explanations, and troubleshooting for common integration issues. This serves as a reliable reference for the team and for LLM context.

---

## 1 · Overview & Purpose
- **Why this integration?** [What problem does it solve, or what capability does it enable for us?]
- **High-Level Interaction:** [Briefly describe how Service A and Service B interact. A simple diagram (e.g., using Mermaid) can be embedded if helpful.]
  ```mermaid
  %% Optional: Example Diagram
  sequenceDiagram
    participant SA as Service A
    participant SB as Service B
    SA->>SB: Request Data
    SB-->>SA: Respond with Data
  ```
- **Key Benefits:** [What are the main advantages of this integration in our system?]

## 2 · Prerequisites
- **Service A:**
    - Version: [e.g., >= 2.0]
    - Account/Setup: [e.g., Enterprise plan needed, specific feature enabled]
    - See: `[Service A Curated Docs](${relatedServiceDocs[0].docPath})` for full setup.
- **Service B:**
    - Version: [e.g., API v3]
    - Account/Setup: [e.g., API key with specific permissions]
    - See: `[Service B Curated Docs](${relatedServiceDocs[1].docPath})` for full setup.
- **Other Dependencies:** [Any other tools, libraries, or configurations required.]

## 3 · Setup & Configuration (Authentication & Connectivity)
*[Provide a step-by-step guide for establishing the connection between Service A and Service B. Include necessary configurations on both sides.]*

### 3.1 · Step 1: [e.g., Configure Service A Endpoint]
- **Action:** [Description of action]
- **Code/Configuration Snippet:**
    ```[language or config format]
    // Configuration for Service A
    [paste verbatim snippet]
    ```
    > **Source:** [Official Doc URL for this step], Section: [Title], Accessed: [YYYY-MM-DD]
    > **Notes:** [Project-specific context or modifications]

### 3.2 · Step 2: [e.g., Obtain API Key from Service B]
*(Structure similar to 3.1)*

### 3.3 · Step 3: [e.g., Store Credentials Securely and Configure Service A]
*(Structure similar to 3.1)*

*(Add more steps as necessary)*

## 4 · Data Flow / Interaction Points
- **Trigger:** [What initiates the interaction? e.g., User action, scheduled job, webhook event from Service A.]
- **Process:**
    1. [Service A does X...]
    2. [Data Y is sent to Service B via Z mechanism...]
    3. [Service B processes data and optionally responds/triggers further action...]
- **Key Data Objects/Payloads:**
    ```json
    // Example payload from Service A to Service B
    { "field": "value" }
    ```
    > **Notes:** [Description of key fields and their meaning.]
- **API Calls / Webhooks Involved:**
    - [Service A calls `POST /serviceB/endpoint` with [payload]]
    - [Service B sends webhook to `our-app/webhook-handler` for event [event_type]]

## 5 · Core Use Cases & Examples
*[Illustrate common ways this integration is used in our project with code examples.]*

### 5.1 · Use Case: [e.g., Syncing User Profiles from Service A to Service B]
- **Description:** [Details of the use case.]
- **Implementation Snippet (Our Code):**
    ```[language]
    // Code showing how our application manages this sync
    [paste code snippet]
    ```
    > **Notes:** [e.g., "This logic resides in `services/userSync.ts`."]
- **Relevant Service A calls:** `[get_user_profile_from_A()]`
- **Relevant Service B calls:** `[update_user_profile_in_B()]`

*(Add more use cases as necessary)*

## 6 · Best Practices for this Integration
- **Error Handling:** [How to handle failures in communication, data validation errors, etc.]
- **Idempotency:** [If relevant, how to ensure operations are idempotent.]
- **Security:** [Specific security considerations, e.g., validating webhook signatures, least-privilege API keys.]
- **Data Consistency:** [Strategies to maintain data consistency between the two services.]
- **Logging & Monitoring:** [What to log for this integration, key metrics to monitor.]

## 7 · Common Pitfalls & Troubleshooting (Edge Cases)
- **Issue 1: [e.g., Authentication Failure (401/403 errors)]**
    - **Symptom:** [Error messages, observed behavior.]
    - **Potential Causes:** [Expired tokens, incorrect permissions, IP whitelisting.]
    - **Solution/Verification:**
        - [Step 1: Check X in Service A settings.]
        - [Step 2: Verify Y in Service B dashboard.]
    > **Reference:** [Link to official doc, SO thread, or internal note.]
- **Issue 2: [e.g., Data Mismatch After Sync]**
    *(Structure similar to Issue 1)*

*(Add more issues as necessary)*

## 8 · Monitoring & Maintenance
- **Key Metrics to Monitor:** [e.g., Number of successful syncs, error rates, latency.]
- **Alerting:** [Conditions under which alerts should be triggered.]
- **Maintenance Tasks:** [e.g., Rotating API keys, checking for deprecated API versions.]

## 9 · References & Further Reading
- [Link to official integration guide (if any): [URL]]
- [Link to Service A API docs: [URL for Service A docs]] (Also see `[Service A Curated Docs](${relatedServiceDocs[0].docPath})`)
- [Link to Service B API docs: [URL for Service B docs]] (Also see `[Service B Curated Docs](${relatedServiceDocs[1].docPath})`)

---

**Related Docs →** [SPPG](../templates/systemic-principles-template.md) · [Service A Docs](../references/) · [Service B Docs](../references/) · [Service Integration References](../references/)