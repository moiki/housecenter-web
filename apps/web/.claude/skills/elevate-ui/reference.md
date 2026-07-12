# Elevate UI — design language & patterns

The concrete tokens and patterns behind the [SKILL](SKILL.md). All of it is live in the repo;
this file is the digested version so you don't have to reverse-engineer it each time. Reference
implementation: the **New Patient** slide-over (`src/pages/patients/PatientsPage.tsx`).

## 1. Theme tokens (global — already in `src/styles/theme.ts`)

These live in the `shared` `ThemeOptions` block merged into both light and dark themes. They
propagate to every surface — prefer adding a token here over restyling one component.

| Token | Value | Why |
|-------|-------|-----|
| Brand accent | `#7c3aed` (`primary.main`) | One violet, used sparingly. |
| Button case | `textTransform: 'none'`, `fontWeight: 600` | Sentence case — the single biggest cheap→premium tell. |
| Button radius | `8` | Slightly tighter than cards. |
| Input radius | `8` (`MuiOutlinedInput`) | Matches buttons. |
| Input resting border | `alpha(text.primary, 0.15)` | Softer than MUI default; adapts to mode. |
| Input hover border | `alpha(text.primary, 0.3)` | A real hover, not dead. |
| Input focus ring | `box-shadow: 0 0 0 3px alpha(primary, 0.15)` | The Stripe/Linear signal. |
| Input transition | `box-shadow 120ms, border-color 120ms` | Quick, functional. |
| Heading tracking | `h4 -0.02em / h5 -0.015em / h6 -0.01em`, weight 700/700/600 | Reads "product", not "document". |
| Card/paper radius | `10` (`shape.borderRadius`) | Cards a touch rounder than controls. |

The input override covers `TextField`, `Select`, and the `x-date-pickers` `DatePicker`
uniformly because all three render through `OutlinedInput` — so the focus ring is consistent
for free. **To extend the language, add a `MuiXxx.styleOverrides` here**, using
`({ theme }) => ({...})` + `alpha(...)` so it works in both modes. Never hardcode hex.

## 2. SlideOver as a form panel (`src/components/shared/SlideOver.tsx`)

Full-height flex column: **fixed header → scrollable body → pinned footer**. `description` and
`footer` are optional (backward compatible). The pinned footer keeps the primary action reachable
on long forms and kills the dead-space-below-the-CTA problem.

```tsx
<SlideOver
  open={open}
  onClose={close}
  title="New patient"
  description="Register a patient in the clinic system."
  footer={
    <>
      <Button variant="text" color="inherit" onClick={close}>Cancel</Button>
      <Button type="submit" form={FORM_ID} variant="contained" loading={mutation.isPending}>
        Create patient
      </Button>
    </>
  }
>
  <MyForm formId={FORM_ID} onSubmit={handleCreate} />
</SlideOver>
```

**The `form` id trick:** the footer button is a DOM sibling of the `<form>`, not a descendant.
Tag the form with `id={FORM_ID}` and give the button `type="submit" form={FORM_ID}` — native HTML
associates them across the tree, so submit + RHF `handleSubmit` validation still run. Drive the
button's `loading` from the mutation's `isPending` (the submit state now lives outside the form).

## 3. FormSection — hierarchy for forms

Groups related fields under a quiet uppercase micro-label. Turns a flat 11-field wall into three
scannable groups (pilot: `Patient details` / `Location` / `Assignment`).

```tsx
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  )
}
```

Wrap the form itself in `sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}` so the
**between-section** gap (3.5) is clearly larger than the **within-section** gap (1.5). That ratio
*is* the hierarchy. Keep two-up rows with `display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5`.

## 4. State patterns (already the repo idiom — reuse, don't reinvent)

**Loading** — skeletons that match the real layout:
```tsx
<Stack spacing={1.5}>{[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>
```
**Empty** — outlined paper, muted icon, one-line hint, optional reset when filters are active:
```tsx
<Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
  <SomeOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
  <Typography sx={{ mt: 1, fontSize: 14 }}>No X yet.</Typography>
  {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ mt: 2 }}>Clear filters</Button>}
</Paper>
```
**Refetch** — dim, don't blank: `sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}`.
**Error** — read `ProblemDetails`: `isApiError(err) ? err.detail : 'Something went wrong'` (see `src/types/common.types.ts`).

## 5. Spacing scale

MUI spacing unit = 8px. Stick to the ladder: `0.5 / 1 / 1.5 / 2 / 2.5 / 3 / 3.5`. Rules of thumb:
- Within a field group: `1.5`. Between form sections: `3 – 3.5`.
- Card/panel padding: `px: 2–3`, `py: 1.5–3`. Header rows: `px: 2, py: 1.5`.
- Never a raw `px` one-off when a spacing token fits.

## 6. Color & borders

- **Accent budget**: `primary` for the one main action per view + the active nav item. Not every
  chip, border, or heading. Overusing violet is what makes a UI look like a template.
- **Status only**: `info` / `success` / `warning` / `error` carry meaning, not taste.
- **Borders/dividers**: `borderColor: 'divider'` or `alpha(theme.palette.text.primary, α)`. This is
  why things read right in dark mode too — always check both themes before finishing.

## 7. Promoting patterns

`FormSection` currently lives locally in `PatientsPage.tsx`. **On its second use, extract it** to
`src/components/shared/FormSection.tsx` (named export, `@/` import) rather than copy-pasting the
`sx`. Same rule for any action-footer or field-group pattern: local until the second caller, shared
after — don't extract prematurely, don't copy-paste twice.

## 8. Do / Don't

| Do | Don't |
|----|-------|
| Sentence-case buttons | ALL-CAPS (or re-adding `textTransform: 'uppercase'`) |
| One consistent field treatment via `RHF*` | Mixing bespoke inputs with wrapper fields |
| Group fields into labelled sections | A flat wall of equal-weight inputs |
| Pin actions in a footer/action row | A `fullWidth` submit floating after the last field |
| `alpha()` + theme palette for borders | Raw hex (`#e5e7eb`), Tailwind classes |
| Skeleton + empty + error + focus states | Only the happy path |
| Short functional transitions (≤150ms) | Decorative/animated flourishes, gradients, glow |
| Verify in both light **and** dark mode | Assuming light-mode-only |
