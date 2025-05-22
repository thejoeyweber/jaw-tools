---
docType: workflow
version: 2.0.0
lastUpdated: 2025-05-21
---

# Adept AI Rapid Workflow & Management Guide

> **Scope** – explains **when / who / in-what-order** work happens.  
> **Why / what** lives in **playbook.md**.  Architectural rules live in **SPPG.md**.

---

## Core Philosophy

Achieve maximum velocity **and** quality through *tight, AI-augmented loops*:

1. **Cycle 0** – generate foundation artefacts, build & deploy Hello-World.  
2. **Iterative Feature Cycles** – Discover → Shape → Build → Release (vertical slice).  
3. **Continuous Refinement** – refactor, calibrate AI, evolve living docs & tooling.

| Always-loaded Docs for LLM | Purpose |
|----------------------------|---------|
| `NORTH_STAR.md` | Strategic compass |
| `SPPG.md` | Canonical rulebook |
| `references/` | Curated official docs |
| `prds/` | Mini-PRDs |
| `templates/` | Skeletons for new docs |

This context is practically managed via Mini-PRD scoping (`includes`/`excludes` in front-matter and Repomix snapshots), ad-hoc selections by the user, and potentially tool-specific context files (e.g., for Cursor). The precise methods for providing this context to different LLMs will vary and evolve with experimentation.

---

## Cycle 0 · Foundation & Hello-World

| Step | Action | Owner |
|------|--------|-------|
| 0.1 | **Generate artefacts from templates** | Lead Dev |
| | `cp templates/north-star-template.md _docs/project-files/NORTH_STAR.md` | |
| | `cp templates/systemic-principles-template.md _docs/project-files/SPPG.md` | |
| 0.2 | Draft **North-Star** | Product |
| 0.3 | **Choose stack & curate docs** → `_docs/project-files/references/` | Dev |
| | (The initial tech stack may be user-dictated or developed in collaboration with an LLM. It's considered 'finalized' for Cycle 0 upon successful Hello-World implementation and creation of corresponding Curated Docs for each service and integration.) | |
| 0.4 | **Build Hello-World baseline** & deploy to preview | Dev + LLM |
| 0.5 | Wire **basic CI/CD** (lint, types, tests, preview) | DevOps |
| 0.6 | Write **SPPG v0.1** (dir contract, auth pattern, etc.) | Dev |
| 0.7 | Tag **v0.1.0-foundation** | Dev |

---

## Iterative Feature Cycle

### Stage 1 · Opportunity Discovery
* Ideate → Lightweight Pitch (consider adapting principles from "Shape Up" methodology by 37signals) → Select 1–2 for shaping.

### Stage 2 · Just-in-Time Shaping
The Mini-PRD should include or link to a clear UI specification, which can be derived from various design tools or AI-assisted design outputs.
| Command / Artifact | Purpose |
|--------------------|---------|
| `npx jaw-tools mini-prd create "…" --includes "features/new/**,_docs/project-files/SPPG.md"` | create PRD |
| UI/UX Input (e.g., Figma, coded prototypes from tools like v0.dev, images, descriptive mockups) | Define visual and interaction design |
| Update PRD (ACs, files, SPPG refs) | finalize scope |
| `npx jaw-tools mini-prd snapshot <ID>` | freeze LLM context |

### Stage 3 · Build & Test
1. Generate failing tests from ACs (LLM-assisted).  
2. **One-shot implementation** via Cursor Agent.  
   (Effective use of Cursor Agent relies on a well-defined, validated Mini-PRD. The 'Shaping' stage focuses on planning and specification clarity, while this 'Build' stage leverages the agent for execution. Review of agent output remains crucial.)
3. ≤ 3 fix prompts per coding task/segment. A "segment" typically refers to a distinct part of the implementation for a given feature (e.g., a specific function, component, or API endpoint). If an LLM-generated segment requires more than 3 iterative fix prompts, revert the LLM's attempt for that segment. Have the LLM summarize the issues encountered, then re-initiate the task for that segment, providing these troubleshooting notes as additional context. This avoids diminishing returns and ensures focused AI contributions. If issues persist, re-scope the Mini-PRD or the segment.  
4. Push → CI → Preview deploy.

### Stage 4 · Review & Release
* Manual QA → finalize PRD ("as-built").  
* PR → `main` (flagged) → prod deploy.  
* Monitor metrics; auto-rollback script on error spike.

---

## Continuous Refinement (Cooldown Days)

* Refactor & extract patterns → shared kernel.  
* AI Calibration Check with Hello-World snippet (triggered by the user as needed, especially during Cooldown Days, to observe model consistency).  
* Update **SPPG**, prune rules, link ADRs.  
* Sync curated docs with upstream releases.  
* Enhance **jaw-tools**, prompt library. (Consideration of CI performance/resource budgets may be introduced later.)  
* **Quarterly** North-Star reassessment.

---

## Prompts Library Workflow

1. Save reusable prompt as  
   `_docs/prompts/<tool>/<topic>.md` with:

   ```yaml
   ---
   tool: cursor
   purpose: generate failing tests for Mini-PRD
   lastUpdated: 2025-05-21
   ---
   ```

2. Link back to spawning PRD.

---

## Metrics Dashboard

| Category      | Metric                    | Source             |
| ------------- | ------------------------- | ------------------ |
| **Velocity**  | PRDs merged / week        | GitHub             |
| **Quality**   | Post-prod bugs per PRD    | Issue labels       |
| **Adherence** | % files passing SPPG lint | CI job             |
| **AI Drift**  | Hello-World diff %        | Calibration script |

---

**Related Docs →** [Playbook](playbook.md) · [SPPG](../project-docs/templates/systemic-principles-template.md) · [North Star](../project-docs/templates/north-star-template.md) · [Templates](templates/) · [Curated Docs](references/) · [ADRs](ards/) · [PRDs](prds/) · [Prompts](../prompts/)