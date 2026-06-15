# Migration Plan — Untitled UI → Material UI v7

## Status: `proposed`
## Branch: `feat/mui-migration` (from `main`)

---

## Context

`housecenter-web` was built with Untitled UI (Tailwind-based component library).
Business decision to migrate to **Material UI v6** to align with the design history of
`house-mui-v1` (the legacy system) and enable faster component availability.

Key references from legacy (`house-mui-v1/src/components`):
- `modals/formDialogContainer.component.js` — fullscreen slide-up Dialog for forms
- `modals/viewDialogContainer.component.js` — fullscreen Dialog for read-only views  
- `confirmDialog.component.js` — small slide Dialog for destructive confirmations
- `comment.component.js` — Froala rich-text in chat bubbles
- `accordion/accordionElement.js` — Froala in expandable treatment details
- `helpers/froala.helper.js` — editor config (full + compact variants)

---

## Goals

1. Replace all Untitled UI components with MUI v7 equivalents
2. Establish a single MUI theme file with the current brand (violet `#7c3aed`)
3. Reproduce the 3 dialog patterns from legacy (FormDialog, ViewDialog, ConfirmDialog)
4. Integrate Froala WYSIWYG editor (`react-froala-wysiwyg`) for rich-text fields
5. Maintain all existing features — zero regression on T11, T12, T13 behavior
6. Remove Tailwind CSS entirely (no more `tw-merge`, `@tailwind`, `globals.css`)

---

## What stays the same

- React 19 + TypeScript + Vite + pnpm
- React Router v7 layout/routing structure
- TanStack Query v5 (all hooks untouched)
- React Hook Form + Zod (all schemas untouched)
- Axios client + interceptors
- Zustand auth store
- All API modules and types
- All page logic — only the JSX/styling layer changes

---

## Phase 0 — Dependencies

### 0a. GO / NO-GO GATE — Froala on React 19 (do this FIRST)

This repo runs **React 19.2.6**. `react-froala-wysiwyg` has historically depended
on React patterns that React 19 removed (`findDOMNode`, legacy lifecycle). Froala
is **not on the critical path** (it's only needed in Phase 5), so de-risk it before
committing to it:

1. Spike: install `react-froala-wysiwyg` + `froala-editor` in a throwaway branch and
   render one `FroalaEditor` + one `FroalaEditorView` under React 19.
2. Verify: editor mounts, `onModelChange` fires, no `findDOMNode`/lifecycle console
   errors, view renders saved HTML.
3. **GO** → proceed with Froala as planned in Phase 5.
   **NO-GO** → swap Phase 5 to a React-19-native editor (TipTap or Lexical) that
   renders the same stored HTML. The rest of this plan is unaffected.

Do not install Froala in the main migration branch until this gate passes.

### Install
```bash
pnpm add @mui/material@^7 @mui/icons-material @emotion/react @emotion/styled
# Froala — only after the 0a gate passes (otherwise install the chosen alternative)
pnpm add react-froala-wysiwyg froala-editor
# MUI date pickers — use the major compatible with core v7 + React 19 (verify at install)
pnpm add @mui/x-date-pickers dayjs
```

> Target **MUI v7** (current stable major; the legacy app was MUI v5, so there is no v6
> to "match"). `<Button loading>` is native in v7 — do **not** add `@mui/lab`
> (`LoadingButton` is deprecated). Note: `@mui/x-date-pickers` versions independently
> from core; install the major that lists core v7 + React 19 as peers (verify at install).

### Remove
The Untitled UI stack is broader than just the icons package — remove all of it:
```bash
pnpm remove \
  @untitledui/icons react-aria react-aria-components @react-types/shared \
  tailwindcss @tailwindcss/vite @tailwindcss/forms @tailwindcss/typography \
  tailwindcss-animate tailwindcss-react-aria-components tailwind-merge
# Then delete: tailwind config, the @tailwind/@custom-variant directives in
# src/styles/globals.css, and the Tailwind plugin in vite.config.ts.
```
Defer the actual removal until the final cleanup step (execution order #10) — pages
still import these until they're migrated.

### Vite config
Add `@emotion/react` to `optimizeDeps` if needed for HMR; remove the
`@tailwindcss/vite` plugin in the final cleanup step.

---

## Phase 1 — Theme system

### File: `src/styles/theme.ts`

```ts
import { createTheme } from '@mui/material/styles'

const brandViolet = '#7c3aed'

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brandViolet },
    background: { default: '#f4f4f8', paper: '#ffffff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiDialog: { defaultProps: { slotProps: { paper: { elevation: 0 } } } },
  },
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: brandViolet },
    background: { default: '#0d0d12', paper: '#18181f' },
  },
  // ...same overrides
})
```

### `main.tsx` → wrap with `ThemeProvider`

**Important — dark mode is NOT client state.** It is **server state** on the user:
`user.darkMode` (`auth.types.ts`), persisted via `PATCH /me/theme`
(`users.api.ts`), and currently applied by toggling a `.dark-mode` class on
`document.documentElement`. The Zustand store (`auth.store.ts`) has no `darkMode`
field — do not assume it does.

Migration steps:
1. In the `ThemeProvider`, pick `user?.darkMode ? darkTheme : lightTheme` (read the
   user from `useAuthStore`). Wrap with `<CssBaseline />` so MUI drives `body` colors.
2. **Keep** the existing `PATCH /me/theme` persistence — the toggle still writes
   `darkMode` to the backend and updates the user via `updateUser()`. MUI re-themes
   automatically once the user object changes; no manual class toggle needed.
3. **Remove** the four `document.documentElement.classList` `.dark-mode` toggles that
   exist today: `Topbar.tsx`, `AuthBootstrap.tsx`, `hooks/auth/useMe.ts`,
   `pages/auth/LoginPage.tsx`. MUI handles dark mode via `palette.mode` internally,
   so the class becomes dead code (also drop the `@custom-variant dark` line in
   `globals.css` during final cleanup).

---

## Phase 2 — Layout shell

### `AppLayout.tsx`
Replace sidebar + topbar with:
- `<Box sx={{ display: 'flex', height: '100vh' }}>` root
- `<Drawer variant="permanent" ...>` for sidebar (collapsible via `width` CSS transition)
- `<AppBar position="fixed" ...>` for topbar
- `<Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>` for content

### Sidebar
- `<List>` + `<ListItemButton selected={isActive}>` for nav items
- `<ListItemIcon>` with `@mui/icons-material` icons
- Group labels: `<ListSubheader>`
- Collapsed state: hide text, keep icons, add `<Tooltip>` on each item
- Brand logo: `<Avatar sx={{ bgcolor: 'primary.main' }}>HC</Avatar>`

### Topbar
- `<Toolbar>` with IconButton for sidebar toggle
- `<InputBase>` with search icon for search bar
- `<IconButton>` for dark mode + notifications bell
- `<Avatar>` + `<Menu>` for user dropdown

### MUI icon mapping (replaces Untitled UI `Icon`)

The current `<Icon name="…" />` component (`src/components/shared/Icon.tsx`) is
referenced with **~33 distinct names**. They fall into two groups — map **both**,
or pages render broken/placeholder icons.

**Group A — nav / UI glyphs** (defined in `Icon.tsx`):

| Current name | MUI icon |
|---|---|
| home | `HomeOutlined` |
| users | `PeopleOutlined` |
| building | `BusinessOutlined` |
| map | `RouteOutlined` |
| briefcase | `WorkOutlined` |
| message | `ChatBubbleOutlineOutlined` |
| chart | `BarChartOutlined` |
| settings | `SettingsOutlined` |
| shield | `AdminPanelSettingsOutlined` |
| mail | `MailOutlined` |
| bell | `NotificationsOutlined` |
| menu | `MenuOutlined` |
| search | `SearchOutlined` |
| plus | `AddOutlined` |
| x | `CloseOutlined` |
| trash | `DeleteOutlineOutlined` |
| send | `SendOutlined` |
| eye | `VisibilityOutlined` |
| check | `CheckOutlined` |
| filter | `FilterListOutlined` |
| download | `FileDownloadOutlined` |
| logout | `LogoutOutlined` |
| sun | `LightModeOutlined` |
| moon | `DarkModeOutlined` |
| chevron | `ChevronRightOutlined` |

> Corrected from the earlier draft: the keys are `message` and `chart`, **not**
> `chat`/`bar-chart`. `sun`/`moon` are used dynamically in `Topbar.tsx`
> (`name={user?.darkMode ? 'sun' : 'moon'}`).

**Group B — field-label glyphs** (used in pages/forms but **not** defined in
`Icon.tsx`, so today they silently fall back to the `home` glyph). Map these to
real icons during the migration:

| Current name | MUI icon |
|---|---|
| name | `PersonOutlined` |
| email | `EmailOutlined` |
| password | `LockOutlined` |
| address | `LocationOnOutlined` |
| city | `LocationCityOutlined` |
| state | `MapOutlined` |
| country | `PublicOutlined` |
| gender | `WcOutlined` |
| body | `AccessibilityNewOutlined` |
| description | `DescriptionOutlined` |
| notes | `NotesOutlined` |
| title | `TitleOutlined` |
| type | `CategoryOutlined` |
| status | `FlagOutlined` |

> Before executing Phase 2, re-run the inventory to catch any name added since:
> `grep -rhoE 'name="[a-z-]+"' src/` (static) plus a scan for dynamic
> `name={…}` expressions. Treat any name missing from both tables as a gap.

---

## Phase 3 — Dialog system (from legacy patterns)

Three reusable dialog components to build in `src/components/shared/`:

### 3a. `FormDialog.tsx`
Mirrors `formDialogContainer.component.js` from legacy.

```tsx
// Props:
// open, onClose, title, onSubmit, loading, children
// Optional: confirmClose (shows ConfirmDialog on X click if form is dirty)

<Dialog fullScreen open={open} slots={{ transition: SlideUpTransition }}>
  <AppBar position="relative" color="default" elevation={0}>
    <Toolbar>
      <IconButton onClick={handleClose}><CloseIcon /></IconButton>
      <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>{title}</Typography>
      <Button type="submit" form="form-dialog-form" loading={loading}>Save</Button>
    </Toolbar>
    {loading && <LinearProgress />}
  </AppBar>
  <Container maxWidth="sm">
    <Box id="form-dialog-form" component="form" onSubmit={onSubmit} sx={{ mt: 4, pb: 6 }}>
      {children}
    </Box>
  </Container>
</Dialog>
```

**Improvement over legacy:** Submit button in AppBar (not below form), so it's always
visible on long forms. Use `form="form-dialog-form"` attribute to link button to form
without prop drilling.

### 3b. `ViewDialog.tsx`
Mirrors `viewDialogContainer.component.js` from legacy.

```tsx
// Props:
// open, onClose, title, children, actions?

<Dialog fullScreen open={open} onClose={onClose}>
  <DialogTitle sx={{ m: 0, p: 2 }}>
    <Typography variant="h5">{title}</Typography>
    <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  <DialogContent dividers>{children}</DialogContent>
  {actions && <DialogActions>{actions}</DialogActions>}
</Dialog>
```

### 3c. `ConfirmDialog.tsx`
Mirrors `confirmDialog.component.js` from legacy (replaces current custom one).

```tsx
// Props:
// open, title, description, confirmLabel, cancelLabel, loading, onConfirm, onCancel
// confirmColor?: 'error' | 'primary' | 'warning'

<Dialog open={open} slots={{ transition: SlideUpTransition }} maxWidth="xs" fullWidth>
  <DialogTitle>{title}</DialogTitle>
  <DialogContent>
    <DialogContentText>{description}</DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={onCancel} disabled={loading}>Cancel</Button>
    <Button onClick={onConfirm} color={confirmColor ?? 'error'} loading={loading}>
      {confirmLabel}
    </Button>
  </DialogActions>
  {loading && <LinearProgress />}
</Dialog>
```

### Shared Slide transition
```ts
const SlideUpTransition = React.forwardRef((props, ref) =>
  <Slide direction="up" ref={ref} {...props} />
)
```

> **v7 slots API:** pass the transition via `slots={{ transition: SlideUpTransition }}`
> and paper overrides via `slotProps={{ paper: { elevation: 0 } }}`. The older
> `TransitionComponent` / `PaperProps` props still work in v7 but are deprecated — use
> slots from the start to avoid the deprecation warnings (and the eventual v8 removal).

**Improvement over legacy:** `confirmColor` prop lets caller set warning vs error color.
`loading` uses `<Button loading>` (native in `@mui/material` v7) for the built-in spinner —
**not** the deprecated `LoadingButton` from `@mui/lab`. The same `<Button loading>` is used
in `FormDialog` (Phase 3a).

---

## Phase 4 — Form inputs

Replace all Untitled UI form components with MUI:

| Untitled UI component | MUI replacement |
|---|---|
| `<Input label="" hint="" isInvalid>` | `<TextField label="" error helperText="" fullWidth>` |
| `<Select label="" items={[]} selectedKey onSelectionChange>` | `<TextField select label="">` + `<MenuItem>` |
| `<Checkbox>` | `<FormControlLabel control={<Checkbox>} label="">` |
| `<Toggle>` | `<FormControlLabel control={<Switch>} label="">` |
| `<TextArea>` | `<TextField multiline rows={4}>` |

### React Hook Form + MUI pattern
```tsx
<Controller
  control={control}
  name="fieldName"
  render={({ field, fieldState }) => (
    <TextField
      {...field}
      label="Label"
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
      fullWidth
    />
  )}
/>
```

Note: MUI `TextField` uses `onChange: (e: ChangeEvent) => void` — compatible with
`Controller`'s `field.onChange` directly (no adapter needed, unlike Untitled UI's
React Aria which needed `onSelectionChange`).

### Date picker
Replace `<Input type="date">` with `@mui/x-date-pickers`:
```tsx
<DatePicker
  label="Birth date"
  value={dayjs(field.value)}
  onChange={(d) => field.onChange(d?.toISOString().split('T')[0])}
  slotProps={{ textField: { fullWidth: true, error: !!errors.birthDate } }}
/>
```

---

## Phase 5 — Froala integration

### Where Froala is used
| Location | Mode | Config |
|---|---|---|
| Treatment details (AccordionElement) | Edit + View | `froalaMinimumOption` (compact, 150px) |
| Treatment comments | Edit + View | `froalaMinimumOption` |
| Patient-level comments | Edit + View | `froalaMinimumOption` |
| Consultation messages | View only | `FroalaEditorView` (no editor) |

### Files to create
- `src/lib/froala.config.ts` — port of `froala.helper.js` (TypeScript, no AWS ref)
- `src/components/shared/RichTextEditor.tsx` — wrapper around `FroalaEditor`
- `src/components/shared/RichTextView.tsx` — wrapper around `FroalaEditorView`

### `froala.config.ts`
```ts
import 'froala-editor/js/plugins.pkgd.min.js'
import 'froala-editor/css/froala_editor.pkgd.min.css'
import 'froala-editor/css/froala_style.min.css'

export const froalaCompactConfig = {
  heightMin: 150,
  heightMax: 300,
  toolbarButtons: {
    moreText: {
      buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'fontSize', 'textColor', 'clearFormatting'],
      buttonsVisible: 4,
    },
    moreParagraph: {
      buttons: ['alignLeft', 'alignCenter', 'alignRight', 'formatUL', 'formatOL', 'indent', 'outdent'],
      buttonsVisible: 3,
    },
    moreRich: {
      buttons: ['insertLink'],
      buttonsVisible: 1,
    },
  },
  pluginsEnabled: ['align', 'colors', 'fontSize', 'link', 'lists', 'paragraphFormat', 'wordPaste'],
  imageUpload: false,
}

export const froalaFullConfig = {
  ...froalaCompactConfig,
  heightMin: 300,
  heightMax: 600,
  toolbarButtons: {
    // Full toolbar — add table, codeView, etc.
  },
}
```

**Improvement over legacy:** Plugins limited to what's actually used (legacy enabled all
plugins including `imageManager`, `embedly`, `emoticons` — unnecessarily heavy bundle).
Also adds TypeScript types.

### `RichTextEditor.tsx`
```tsx
import FroalaEditor from 'react-froala-wysiwyg'
import { froalaCompactConfig } from '@/lib/froala.config'

interface Props {
  value: string
  onChange: (value: string) => void
  config?: object
  error?: boolean
  helperText?: string
}

export function RichTextEditor({ value, onChange, config, error, helperText }: Props) {
  return (
    <Box>
      {error && <FormHelperText error>{helperText}</FormHelperText>}
      <FroalaEditor
        model={value}
        onModelChange={onChange}
        config={{ ...froalaCompactConfig, ...config }}
      />
    </Box>
  )
}
```

### `RichTextView.tsx`
```tsx
import FroalaEditorView from 'react-froala-wysiwyg/FroalaEditorView'

export function RichTextView({ content }: { content: string }) {
  return (
    <Box sx={{ '& .fr-view': { fontFamily: 'inherit' } }}>
      <FroalaEditorView model={content} />
    </Box>
  )
}
```

### Usage with React Hook Form
```tsx
<Controller
  control={control}
  name="description"
  render={({ field, fieldState }) => (
    <RichTextEditor
      value={field.value}
      onChange={field.onChange}
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
    />
  )}
/>
```

---

## Phase 6 — Data tables

Replace Untitled UI `Table` + `TableCard` with MUI:

```tsx
// Option A — MUI Table (current pages: Clinics, Patients, etc.)
<Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
  <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
    <Chip label={count} size="small" />
  </Box>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        ...
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map(row => <TableRow hover key={row.id}>...</TableRow>)}
    </TableBody>
  </Table>
</Paper>
```

**TableCard wrapper component** (`src/components/shared/DataCard.tsx`):
```tsx
// Wraps Paper + optional title/badge header + children
// Replaces TableCard.Root + TableCard.Header pattern
```

---

## Phase 7 — Remaining shared components

| Current | MUI replacement |
|---|---|
| `SlideOver` (Untitled UI) | `<Drawer anchor="right" open>` with `PaperProps={{ sx: { width: 480 } }}` |
| `PageHeader` | Custom `Box` with `Typography variant="h5"` + `Typography variant="body2"` + actions slot |
| `Badge` (status chips) | `<Chip label="" color="" size="small" />` with `variant="filled"` or `"outlined"` |
| `Avatar` initials | `<Avatar sx={{ bgcolor: 'primary.main' }}>` |
| `SessionsBarChart` | Keep as-is (pure SVG, no MUI dep) |

### SlideOver → Drawer
```tsx
<Drawer anchor="right" open={open} onClose={onClose}
  PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
    <Typography variant="h6">{title}</Typography>
    <IconButton onClick={onClose}><CloseIcon /></IconButton>
  </Box>
  {children}
</Drawer>
```

---

## Phase 8 — Notifications + Bell (T14 prep)

Replace custom notification bell with:
- `<Badge badgeContent={unreadCount} color="error"><NotificationsOutlined /></Badge>`
- `<Menu anchorEl={...}>` for dropdown list
- `<MenuItem>` for each notification with `<ListItemText primary subtitle>`

---

## Component migration checklist

| Component | Phase | Notes |
|---|---|---|
| Theme + ThemeProvider | 1 | Brand violet, light/dark |
| AppLayout shell | 2 | Drawer + AppBar |
| Sidebar | 2 | List + ListItemButton |
| Topbar | 2 | Toolbar + InputBase |
| FormDialog | 3a | fullscreen, submit in AppBar |
| ViewDialog | 3b | fullscreen, close + actions |
| ConfirmDialog | 3c | small slide, LoadingButton |
| TextField (Input) | 4 | Controller-compatible |
| Select (MUI) | 4 | TextField select + MenuItem |
| DatePicker | 4 | @mui/x-date-pickers + dayjs |
| Switch / Checkbox | 4 | FormControlLabel wrappers |
| RichTextEditor | 5 | FroalaEditor wrapper |
| RichTextView | 5 | FroalaEditorView wrapper |
| froala.config.ts | 5 | Typed, trimmed plugins |
| DataCard (TableCard) | 6 | Paper + header + MUI Table |
| Drawer (SlideOver) | 7 | Right-anchored |
| PageHeader | 7 | Box + Typography |
| Chip (Badge/status) | 7 | MUI Chip color variants |
| Notification bell | 8 | MUI Badge + Menu |

---

## Pages affected (all pages need update)

All pages in `src/pages/` use Untitled UI components. Pages with Froala
(to be added during this migration or T14+):

- `PatientProfilePage.tsx` → TreatmentsTab → treatment details (Froala edit/view)
- Treatment comments → `RichTextEditor` + `RichTextView`
- Patient comments → `RichTextEditor` + `RichTextView`
- `ConsultationDetailPage.tsx` → message body already plain text (keep or upgrade to Froala view)

---

## Execution order (recommended)

1. **Phase 0** — Install deps, remove Untitled UI
2. **Phase 1** — Theme (unblocks everything else)
3. **Phase 2** — Layout shell (sidebar + topbar)
4. **Phase 3** — Dialog components (used everywhere)
5. **Phase 4** — Form inputs (used in every SlideOver/FormDialog)
6. **Phase 7** — Shared components (Drawer, PageHeader, DataCard)
7. **Phase 6** — Migrate all table pages
8. **Phase 5** — Froala integration (treatment/comment pages)
9. **Phase 8** — Notification bell
10. Final cleanup: remove `src/components/base/`, `src/components/application/`, Tailwind config

---

## Risks

| Risk | Mitigation |
|---|---|
| **`react-froala-wysiwyg` may not render under React 19** (legacy `findDOMNode`/lifecycle reliance) | **Phase 0a go/no-go spike before adopting.** NO-GO → swap to TipTap/Lexical (React-19-native) rendering the same stored HTML. |
| Froala license key required for production | Use eval mode for dev; obtain license before prod deploy |
| MUI `<Select>` needs `<InputLabel>` + `<FormControl>` boilerplate | Use `<TextField select>` pattern instead (simpler) |
| `react-froala-wysiwyg` types may be incomplete | Use `// @ts-ignore` on model/config props if needed |
| Removing Tailwind breaks any `className="..."` in non-base components | Audit all `className` usages before removing Tailwind |
| `@mui/x-date-pickers` adds ~100kb gzip to bundle | Only import what's used; consider keeping `<input type="date">` for simple fields |
