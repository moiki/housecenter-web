---
name: elevate-ui
description: Propose and implement restrained, product-grade design & quality improvements to housecenter-web React components — the "Silicon Valley product" bar without the flashiness. Applies the project's established design language (theme tokens + structural patterns) through MUI v9 `sx` and the shared theme. Use when a page/component/form "looks simple/plain/cheap", needs visual polish, a redesign, better hierarchy/spacing/empty-and-loading states, or when asked to elevate, refine, or improve the look-and-feel/UX of a screen. Examples: "esto se ve simple", "mejorá el diseño de esta pantalla", "make this form look premium", "polish the X page", "dale un aspecto más pro a Y", "elevate the dashboard".
argument-hint: [page/component path or name to elevate, e.g. "src/pages/clinics/ClinicsPage.tsx" or "the dashboard"]
---

# Elevate UI

Raise a housecenter-web surface to a **product-grade** standard: confident, consistent, and
quiet. This skill both **audits** a component against the project's design language and
**implements** the improvements. The goal the user set is a "Silicon Valley product" feel —
which means **refinement, not decoration**. If a change would read as flashy, it's wrong.

The design language was established by a pilot (the **New Patient** slide-over on
`src/pages/patients/PatientsPage.tsx`) and codified into the theme. **Read
[reference.md](reference.md) first** — it holds the tokens, the reusable patterns, and
copy-paste snippets. Then read the pilot files to see the language in situ:
`src/styles/theme.ts`, `src/components/shared/SlideOver.tsx`, `PatientsPage.tsx`.

## Principles (the bar)

1. **Restraint over decoration.** No gradients, neon, glow soup, drop-shadow stacks, or
   animated flourishes. Premium reads as generous spacing, one accent color used sparingly,
   consistent type, and states that are all handled. When in doubt, remove.
2. **Consistency is the product.** One label strategy, one radius family, one spacing rhythm,
   one icon set. Inconsistency (e.g. a floating-label field next to a placeholder-only field,
   or an ALL-CAPS button next to a sentence-case one) is the #1 "cheap" tell — hunt it down.
3. **Hierarchy: group, don't list.** A flat wall of equal-weight fields/rows reads as a form
   dump. Create scan paths with section labels, weight, size, and — most of all — *space between
   groups vs. within a group*.
4. **Theme, never hardcode.** Every value comes from the theme or `sx` tokens. No raw hex, no
   Tailwind utility classes, no magic pixel one-offs that drift from the system.
5. **A screen isn't done until all four states are.** Loading (`Skeleton`), empty (outlined
   `Paper` + muted icon + hint), error (`ApiError.detail`), and focus/hover. Missing states are
   the difference between a demo and a product.

## Workflow

1. **Load the language.** Read `reference.md` + the three pilot files above. Do not invent a
   new aesthetic — extend the existing one.
2. **Audit** the target against the checklist below. Note findings by *impact* (a theme-level
   fix beats ten per-component tweaks because it propagates).
3. **Propose** a short, prioritized plan before large edits: theme-level wins first (global,
   high leverage), then structural (layout/sections/footers), then per-component polish. If the
   change touches the **shared theme or a shared component** (`theme.ts`, `SlideOver`, anything
   in `src/components/shared/**`), surface that blast radius and get a quick confirm — it moves
   every screen at once and can't be eyeballed here.
4. **Implement** with `sx` + the theme + existing shared patterns. When a pattern repeats
   (a labelled field group, an action footer), reuse or extract a shared component — see
   "Promoting patterns" in `reference.md` — rather than copy-pasting `sx` blocks.
5. **Verify**: `pnpm build` (type-check) + `pnpm lint`. There is **no test runner** — never claim
   tests pass. State plainly that **visual verification needs the running app** (`pnpm dev`), and
   the backend if the surface is behind auth. Do not overclaim a "before/after" you didn't see.

## Audit checklist

**Typography & hierarchy**
- [ ] Headings use the theme scale (tight tracking, weight 600–700); body/secondary text uses
      `color: 'text.secondary'`. No ad-hoc font sizes competing with the scale.
- [ ] Long forms/sections have quiet group labels (see `FormSection` in the pilot), not a flat list.

**Spacing & rhythm**
- [ ] Space *between* groups > space *within* a group (the pilot uses `gap: 3.5` between sections,
      `gap: 1.5` within). Uniform gaps everywhere = no rhythm.
- [ ] No dead space dumped at the bottom of a panel/card; actions are pinned, not floating mid-flow.

**Inputs & forms**
- [ ] One consistent field treatment across the form (all go through the shared `RHF*` wrappers →
      one focus ring, one radius, one border). No mix of bespoke inputs.
- [ ] Submit/primary action sits in a pinned footer (slide-overs) or a clear action row (dialogs/
      cards), not inline after the last field. Include a `Cancel`/dismiss.
- [ ] Loading state on the submit button (`loading={mutation.isPending}`); the form disables while
      submitting.

**Buttons & actions**
- [ ] Sentence case, never ALL-CAPS (theme handles this — flag any local `textTransform` override
      that re-introduces caps). Primary = `contained`, secondary = `text`/`outlined`, one primary
      per view.

**Color & surfaces**
- [ ] Accent (`primary`) used sparingly for the one main action + active nav; not sprayed across
      every chip/border. Semantic colors (`info`/`success`/`error`) for status only.
- [ ] Borders/dividers via `divider` or `alpha(theme.palette.text.primary, …)`, never raw hex.
      Works in **both** light and dark mode — check both.

**States & motion**
- [ ] Loading = `Skeleton` matching the real layout; empty = outlined `Paper` + muted icon + one-line
      hint (+ a reset/CTA when filters are active); error = `isApiError(err)` → `.detail`.
- [ ] Focus ring present and visible (theme provides it for inputs); hover states on rows/cards.
- [ ] Transitions are short (≤150ms) and functional (opacity on refetch, the drawer slide) — no
      decorative animation.

**Accessibility (baseline)**
- [ ] Icon-only buttons have `aria-label`; toggles have `aria-pressed`; interactive elements are
      real buttons/links (keyboard-reachable), matching the HelpTooltip precedent.

## Guardrails (do not violate)

- **Stay inside the system.** MUI v9 `sx` + the shared theme only. No new UI/animation/CSS
  dependencies, no Tailwind classes, no raw hex, no `styled()` one-offs when `sx` will do.
- **Don't break the four-layer architecture.** This is presentation only — never move logic into
  a page, never let a page import `apiClient`, never touch hooks/api modules to serve a visual
  change. If polish seems to *need* a data change, stop and flag it.
- **Named exports, `@/` alias.** New shared components follow the repo's filename + export rules.
- **Preserve behavior & copy semantics.** Elevate the look; don't silently rename features, drop
  fields, or change validation. Sentence-casing button labels is fine; renaming a feature is not.
- **Backward-compatible shared changes.** New props on shared components (like `SlideOver`'s
  `description`/`footer`) must be optional so existing callers keep working untouched.
- **Restraint check before finishing.** Re-read the diff and delete anything that's decoration
  rather than clarity. If you added a gradient, a second accent color, or a shadow stack — cut it.

## Output

Report: (1) the findings you acted on, grouped by impact; (2) files changed (flag any shared
theme/component with its blast radius); (3) `pnpm build` + `pnpm lint` result; (4) an explicit
"visual pass pending — run `pnpm dev`" note. End with any follow-up surfaces the same language
should reach next.
