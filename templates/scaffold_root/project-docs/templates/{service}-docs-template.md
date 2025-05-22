---
docType: template
version: 1.1.0
lastUpdated: [YYYY-MM-DD] # Date this template file was last changed. User updates this in their specific service-doc instance.

# ─── Curated Service Docs Front-matter ───
serviceName: [Name of the Service]        # e.g., Supabase, OpenAI API, Stripe
serviceType: [Type of Service]            # e.g., BaaS, LLM API, Payment Gateway, Database
primaryDocumentationUrl: [Primary official doc URL] # Canonical docs homepage
sourceUrls: # List of key official documentation pages or resources
  - url: [URL to specific doc page 1]
    description: [Brief note about this source, e.g., "Auth Quickstart"]
  - url: [URL to specific doc page 2]
    description: [Brief note about this source, e.g., "Storage API Reference"]
tags: [[service], [type], [e.g., database], [auth]]
---

# Curated Docs – [Name of the Service]

> **Purpose:** To provide a centralized, "single source of truth" mini-wiki for **[Name of the Service]** within our project. It includes verbatim, cited snippets from official documentation, best practices, project-specific configurations, and common troubleshooting tips. This document helps ensure consistent and accurate information is used by the team and can be selectively provided as context to LLMs.

---

## 1 · Overview
- **What is [Name of the Service]?** [Brief description of the service, its primary function, and key benefits in our context.]
- **Why are we using it?** [Specific reasons for choosing this service for our project.]
- **Core Features Used:** [List the main features/components of this service that we leverage.]

## 2 · Quick Start & Setup

### 2.1 · Official Setup Snippet(s)
```[language, e.g., typescript]
// Verbatim code snippet for initial setup or connection
[paste official setup code here]
```
> **Source:** [Official Doc URL for this snippet], Section: [Section Title/Link], Accessed: [YYYY-MM-DD]
> **Notes:** [e.g., "This is for client-side initialization."]

### 2.2 · Project-Specific Setup & Configuration
- **Environment Variables:**
    - `[SERVICE_API_KEY]`: [Description of how to obtain/use]
    - `[SERVICE_URL]`: [Description]
- **Initialization Code (Our Wrapper/Service):**
    ```[language, e.g., typescript]
    // Snippet of our project's specific setup/initialization code
    [paste project-specific setup code]
    ```
    > **Notes:** [e.g., "Located in `lib/services/[service-name].ts`"]
- **Key Configuration Details:** [Any important configuration settings specific to our usage.]

## 3 · Core Concepts
*[Explain fundamental concepts, terminology, and architecture of the service relevant to our usage.]*
- **Concept 1: [Name]** - [Description]
    > **Source:** [Official Doc URL], Section: [Section Title/Link], Accessed: [YYYY-MM-DD]
- **Concept 2: [Name]** - [Description]

## 4 · Key Features & Functionality (Examples)
*[Detail how to use key features we rely on, with code examples and citations.]*

### 4.1 · Feature: [Name of Feature, e.g., User Authentication]
- **Description:** [Briefly describe the feature and its use case.]
- **Code Example:**
    ```[language]
    // Verbatim or adapted code snippet demonstrating the feature
    [paste code here]
    ```
    > **Source:** [Official Doc URL], Section: [Section Title/Link], Accessed: [YYYY-MM-DD]
    > **Notes:** [e.g., "Illustrates how to sign up a new user."]
- **Important Considerations:** [Any caveats, limits, or best practices for this feature.]

### 4.2 · Feature: [Name of Feature, e.g., Data Storage]
*(Structure similar to 4.1)*

*(Add more feature sections as necessary)*

## 5 · API Usage / SDK Integration
- **Primary SDK/Library Used:** [Name and version, e.g., `[service-sdk-js] v2.5.0`]
- **Key API Endpoints / SDK Functions:**
    - `functionName()`: [Description, common parameters, example usage.]
        ```[language]
        // Example
        ```
        > **Source:** [Official Doc URL], Section: [API Reference - functionName], Accessed: [YYYY-MM-DD]
- **Rate Limits & Quotas:** [Important limits to be aware of.]
    > **Source:** [Official Doc URL], Section: [Limits/Pricing], Accessed: [YYYY-MM-DD]

## 6 · Best Practices & Our Style Guide
- **General Best Practices:**
    - [Best practice 1 from official docs or community]
        > **Source:** [URL], Accessed: [YYYY-MM-DD]
- **Our Project-Specific Conventions:**
    - [e.g., "Always use our wrapper function `get[Service]Client()` for authenticated requests."]
    - [e.g., "Error handling for [Service] API calls should follow pattern X."]
- **Security Considerations:** [Security best practices for this service.]
- **Performance Tips:** [Tips for optimizing usage.]

## 7 · Common Use Cases in Our Project
- **Use Case 1: [Name]** - [Description of how we use the service for this scenario, with links to relevant code if possible.]
- **Use Case 2: [Name]** - [Description]

## 8 · Troubleshooting / FAQs
- **Issue 1: [Common problem or error message]**
    - **Symptom:** [How it manifests]
    - **Cause:** [Likely cause]
    - **Solution:** [Steps to resolve]
        ```[relevant code/command]
        // Fix
        ```
    > **Source/Reference:** [Link to StackOverflow, GitHub issue, or official troubleshooting guide]
- **Issue 2: [Another common problem]**
    *(Structure similar to Issue 1)*
- **Debugging Tips:** [How to enable verbose logging, use debugging tools, etc.]

## 9 · References & Further Reading
- [Link to primary documentation: [Primary official doc URL]]
- [Link to API status page: [URL]]
- [Link to community forum/support: [URL]]
- *(Add other relevant links)*

---

**Related Docs →** [SPPG](../templates/systemic-principles-template.md) · [Mini-PRDs](../prds/) · [Service Integrations](../references/)