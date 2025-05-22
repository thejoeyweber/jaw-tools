---
docType: playbook
version: 2.0.1
lastUpdated: 2025-05-22
---

# The Adept AI Playbook  
*Rapid Prototyping & Production with Large-Language Models*

> **Purpose** – capture **what** we build first, **how** we slice work, and **which artefacts are mandatory**.  
> **Workflow.md** covers scheduling; **SPPG.md** holds hard architectural rules.

---

## 0 · Foundation Artefacts (required before Code Day 1)

| Artefact | Template | Purpose |
|----------|----------|---------|
| **North-Star** `_docs/project-files/NORTH_STAR.md` | `/templates/north-star-template.md` | Strategic compass (3 P Canvas). |
| **SPPG** `_docs/project-files/SPPG.md` | `/templates/systemic-principles-template.md` | Canonical architectural rulebook (includes dir contract). |
| **Curated Docs** `_docs/project-files/references/{service}-docs.md` | `/templates/{service}-docs-template.md` | Single source of truth for tech snippets & citations. |
| **Doc Templates** `/templates/*.md` | — | Skeletons for new living docs (incl. for ADRs, Mini-PRDs, etc.). The `ards/` directory should be established. |
| **Prompt Library** `_docs/prompts/` | — | Re-usable, version-controlled prompts. |

All docs include front-matter (`docType`, `version`, `lastUpdated`) for linting & LLM routing.

---

## 1 · Guiding Philosophy — The Five Pillars

1. **Hello-World First** – prove stack & integrations before feature work.  
2. **Vertical Slices** with Mini-PRD spec and feature-folder isolation.  
3. **AI Drafts, Human Orchestrates** – LLM generates; tests & review gate.  
4. **Living Docs, Single Sources** – SPPG, Curated Docs, ADRs evolve; docs reference, never duplicate.  
5. **Rapid Zero-to-One & Calibration** – hours-to-staging cycles plus periodic Hello-World re-prompts to detect model drift.

---

## 2 · Core Principles & Guides

*Summarised here – detailed mechanics live in `workflow.md`.*

| # | Principle |
|---|-----------|
| 1 | Vertical slices ship UI → API → DB → tests together. |
| 2 | Mini-PRD co-located in slice, machine-parsable. |
| 3 | Feature-folder pattern & shared kernel paths are enforced by SPPG lint. |
| 4 | Tests-first; CI gates (lint, types, tests, a11y, perf). |
| 5 | Cooldown every 4-6 slices: refactor, update SPPG/ADRs, AI calibration. |

---

## 3 · Branching & Agent Isolation Guide

**Default Workflow:**  
Each mini-PRD is developed on its own dedicated feature branch, following industry best practices for parallel development.  
Branches are created off the latest main (or dev) branch, and merged via pull requests after review and CI checks.

**Agent Isolation:**  
For almost all development, branching is sufficient for agent (human or AI) isolation.  
If more extreme isolation is needed (e.g., agents running risky or experimental code), a full repo **clone** or **fork** can be used.  
This approach may be appropriate for:
- Security/experiment sandboxes
- Temporary, destructive batch experiments
- Strict resource separation for agents

In these cases, merge workflows require explicit manual sync/merge of desired changes back to the main repo.

**Best Practice:**  
Use feature branches unless your use case clearly requires full repo cloning.  
Document rationale for full isolation in an ADR if you depart from branching norm.

---

## 4 · Document & Template Governance

| Rule | Enforcement |
|------|-------------|
| Front-matter on every markdown | CI `docs-check` job rejects files without it. |
| Reference > duplication | Lint rule: links to Curated Docs preferred. |
| ADR for deviations | New ADR starts in `proposed`; CI blocks merge until `accepted`. |
| Prompts in VCS | Saved in `_docs/prompts/`, front-matter included. |

---

## 5 · Toolchain Snapshot

*Version pins and links stored in `_docs/project-files/references/stack-docs.md` (auto-generated).*

---

## 6 · Success Signals

| Area | Metric |
|------|--------|
| Velocity | Mini-PRDs merged / week |
| Quality  | Post-merge defect observations |
| Adherence | % files passing SPPG lint |
| AI-Drift | Hello-World Output Consistency |

Initially, 'Post-merge defect rate' and 'Hello-World Output Consistency' will be assessed through user observation and qualitative review. Specific metrics may be formalized later based on experience.

Metric collection scripts are referenced in `workflow.md`.

---

## 7 · Living-Doc Reminder

All docs, including this one, **evolve**.  
Update `lastUpdated`, bump `version`, and link the PR / ADR that justified the change.

Document versions (specified in the `version` front-matter field) should follow Semantic Versioning (SemVer - MAJOR.MINOR.PATCH):
*   **MAJOR** changes involve significant restructuring, removal of core concepts, or changes that break compatibility with how the document was previously understood or used.
*   **MINOR** changes add new information, sections, or clarifications that are backwards-compatible.
*   **PATCH** changes are for minor corrections, typo fixes, or formatting updates.

---

**Branching & Agent Isolation: Quick Reference Table**

| Approach              | Use case                                        | Merge Process         |
|-----------------------|--------------------------------------------------|----------------------|
| **Feature Branch**    | Standard dev, most AI agent work                 | Normal PR, auto/CI   |
| **Repo Clone/Fork**   | Isolation for high-risk/experimental work        | Manual sync/PR merge |
| **Clone then Branch** | Multiple isolated experiments within a clone      | Advanced/manual      |

---

**Related Docs →** [Workflow](workflow.md) · [SPPG](../project-docs/templates/systemic-principles-template.md) · [North Star](../project-docs/templates/north-star-template.md) · [Templates Index](templates/) · [Curated Docs](references/) · [ADRs](ards/) · [PRDs](prds/)
