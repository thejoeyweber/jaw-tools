---
docType: template
version: 1.0.1
lastUpdated: 2025-05-21 # Date this template file was last changed. User updates this in their project's SPPG.md instance.
---

# Systemic Principles & Patterns Guide (SPPG) · **Template**

> Pull *verbatim* technical snippets from `_docs/project-files/references/`.  
> **Never duplicate** content—link instead.  
> **Directory changes → ADR required** (see §0).

---

## 0 · Core Principles (non-negotiable)

1. **Vertical Slices, Not Layers** – each feature ships UI → API → DB → tests.  
2. **Mini-PRD** – one markdown spec co-located in the slice.  
3. **Feature-Folder Pattern** – `/features/<slug>/{api,ui,hooks,model,tests}` (see §1).  
4. **Shared Kernel** – global packages `/packages/{models,ui,utils}`.  
5. **Test-First & Contract-Driven** – failing tests written before code.  
6. **CI Gatekeepers** – lint, types, tests, a11y, Lighthouse, secret-scan.  
7. **Zero-to-One Cycles** – hours from code → staging (flagged).  
8. **Cooldown & Refactor** – extract patterns, prune, update SPPG/ADRs.  
9. **Hello-World Calibration** – re-prompt baseline to detect AI drift.  
10. **Docs Are Living** – update `version` / `lastUpdated`, add ADR for rule changes.

---

## 1 · Project Directory Contract (Mandatory)

```text
/
├─ app/                       # Next.js layouts & route segments (Server)
│  ├─ layout.tsx              # Global shell
│  └─ <route>/page.tsx        # Thin pages consuming feature UI
│
├─ features/                  # Vertical slices
│  └─ <feature-slug>/
│     ├─ api/
│     ├─ model/
│     ├─ ui/                  # *.server.tsx / *.client.tsx
│     ├─ hooks/
│     ├─ tests/
│     └─ repomix.profile.json
│
├─ components/                # Global atoms / molecules
├─ packages/
│  ├─ models/                 # TS types, Prisma schema, Zod
│  ├─ ui/                     # shadcn-themed primitives
│  └─ utils/                  # helpers, DataLoader, formatters
│
├─ styles/                    # Tailwind config & globals
├─ public/                    # Static assets
└─ _docs/
   ├─ project-files/
   │  ├─ playbook.md
   │  ├─ workflow.md
   │  ├─ SPPG.md              # ← this file (instantiated)
   │  ├─ NORTH_STAR.md
   │  ├─ references/          # curated service docs
   │  ├─ prds/                # live + completed Mini-PRDs
   │  └─ ards/                # Architectural Decision Records
   └─ prompts/                # reusable prompt files
```
**Notes on UI Directory Structure:**
*   `packages/ui/`: Contains base UI primitives, ideally adhering closely to a chosen library like shadcn/ui. The goal is to keep these components as direct-passthroughs or very lightly wrapped versions of the source library components, minimizing custom logic.
*   `components/`: Contains global "molecule" or "organism" level components. These are often compositions of primitives from `packages/ui/` or feature-specific UI elements that have been promoted to global use. This distinction helps maintain a clean base UI library in `packages/ui/` and provides a clear place for more complex or composed UI elements, aiding LLM understanding and preventing unnecessary proliferation of base component variations.

> **Enforcement** – modifications to this tree **must** ship with an ADR and a CI update.

---

## 2 · Core Tech Stack (placeholder – fill after Hello-World)

* **Frontend Framework:** …
* **Database:** …
* *(extend as dictated by curated docs)*

---

## 3 · API Standards (placeholder)

* Example: REST JSON, 2-tier error envelope, etc.

---

## 4 · Security Mandates (placeholder)

* Example: Zod input validation, secrets in CF Secrets Manager,…

---

*(Add further sections as your project requires)*

**Related Docs →** [Playbook](../playbook.md) · [Workflow](../workflow.md) · [North Star](../templates/north-star-template.md) · [Templates Index](../) · [Curated Docs](../references/) · [ADRs](../ards/) · [PRDs](../prds/)