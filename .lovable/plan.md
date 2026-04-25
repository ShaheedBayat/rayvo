# UI/UX Polish Pass

A focused polish round to make Rayvo feel premium and easy to use. Three issues are confirmed bugs (sidebar scrollbar, status filter, live preview disappearing). The rest is an app-wide polish sweep.

---

## 1. Confirmed bug fixes

### a) Ugly white scrollbar on the sidebar (Windows / some browsers)
The sidebar `<nav>` uses `overflow-y-auto` with no scrollbar styling, so Windows renders the default white system scrollbar against the dark sidebar.

**Fix:** Add a styled custom scrollbar utility (`.scrollbar-subtle`) in `src/index.css` that:
- Uses thin width (`scrollbar-width: thin` for Firefox)
- Tints the thumb with `--sidebar-border` and the track to transparent for WebKit
- Fades the thumb in only on hover for a clean look
Apply it to the sidebar nav and any other internal scrollable areas (command palette list, dropdowns, table containers).

### b) Status filter pills look bad and scroll awkwardly
On the Invoices page (and similar lists) the status filters are pills inside a horizontal scroll container. They wrap awkwardly, get cut off, and there's no affordance for hidden options.

**Fix — switch to a Tabs-style segmented control with smart overflow:**
- Replace pills with a single underlined tab strip that uses the existing shadcn `Tabs` styling language (filled active tab, muted inactive, no border-radius mismatch).
- On wide screens: render all statuses inline with no scroll.
- On narrow screens: show the first ~4 most-used (`All`, `Draft`, `Awaiting Payment`, `Paid`) inline, and roll the rest into a "More ▾" dropdown (Overdue, Awaiting Approval, Partially Paid, Void, Deleted). This removes horizontal scroll entirely.
- Add subtle counts next to each label (e.g. `Draft 3`) — already calculated in `AppLayout`, just reuse the logic per-status.

Apply the same treatment to Quotes and Credit Notes status filters for consistency.

### c) Live preview disappears around 1257px viewport
`CreateInvoice.tsx` hides the preview with `hidden xl:block` (xl = 1280px). Because `AppLayout` also caps content at `max-w-6xl` (1152px), the preview only appears on very wide screens — and on the user's 1257px viewport it's gone.

**Fix:**
- Lower the breakpoint to `lg:block` (1024px) so the preview appears whenever there is enough room.
- Remove the `max-w-6xl` cap on the invoice/quote create+edit pages (let those pages use full width — they have a 2-column layout that needs room). Other pages keep the cap.
- Tighten the form column widths so the right preview pane gets ~360px, and make the preview pane itself slightly narrower text but proportionally readable.

### d) Line item description gets cut off in the preview
`InvoiceLivePreview.tsx` uses `truncate max-w-[120px]` on the item description and a fixed `w-44` totals column.

**Fix:**
- Remove the hard `max-w-[120px]` and let description wrap to 2 lines with `line-clamp-2` and `break-words`.
- Drop the `font-mono` on numbers in the preview to a tabular-nums approach (`tabular-nums`) so numbers still align without looking technical.
- Loosen the totals column to `w-48` and right-align with `tabular-nums`.
- Increase preview base font from `text-[11px]` to `text-xs` (12px) — still compact but readable.

---

## 2. App-wide polish sweep (high-impact, low-risk)

Group these into a single pass so everything feels consistent.

### Layout & density
- **Page container width:** Bump `AppLayout`'s `max-w-6xl` to `max-w-7xl` so dashboards/tables breathe on 13"+ screens, and let create/edit pages opt out (full width).
- **Consistent page header pattern:** Title + subtitle + actions right-aligned, with a thin divider below. Audit Overview, Invoices, Customers, Products, Quotes, Reports, Settings to use the same spacing rhythm (mb-6, gap-3).
- **Card padding:** Standardize all `rounded-lg border bg-card` cards to `p-5` (currently a mix of `p-4`, `p-5`, `p-6`).

### Sidebar
- Add the styled scrollbar (above).
- Active-item indicator: replace the `-ml-[2px]` left border hack with a clean `before:` pseudo-bar that doesn't shift content.
- Add a subtle hover background transition (150ms) so navigation feels more responsive.
- Group labels (Sales, Manage) get a touch more letter-spacing and a hairline divider above.

### Forms (Create/Edit Invoice, Quote, Credit Note)
- **Sticky action bar:** The "Cancel / Save Draft / Save & Send" buttons should stick to the top header on scroll for long forms.
- **Inline validation:** Mark required fields with a red dot, surface errors under the field instead of toast-only.
- **Better empty states:** When no line items are added yet, show a soft empty-state row with "Add your first item" instead of just an Add button.
- **Date pickers:** Audit `InvoiceDatePicker` for keyboard accessibility and ensure the popover doesn't get clipped.

### Tables (Invoices, Quotes, Customers, Products, Credit Notes)
- **Row hover:** Subtle `hover:bg-muted/40` instead of the current accent.
- **Sticky headers** when the table is taller than viewport.
- **Empty-state illustrations:** Replace plain "No invoices found" with a friendly icon + CTA ("Create your first invoice").
- **Mobile cards:** On `< sm`, switch tables to stacked cards (already done in some places, audit for consistency).

### Buttons & focus
- All interactive elements get a consistent focus ring (`focus-visible:ring-2 ring-ring ring-offset-2`).
- Primary buttons get a subtle hover lift (translate-y-[-1px] + shadow).
- Loading states on every async button (spinner + disabled).

### Typography
- Standardize headings to a clear scale: `text-2xl font-semibold` (page), `text-lg font-medium` (section), `text-xs uppercase tracking-wider text-muted-foreground` (labels).
- Use `tabular-nums` on every monetary figure across the app for clean column alignment.

### Micro-delight
- Subtle entry animations on cards (already partially there with `stagger-*` — apply to Invoices/Quotes lists).
- Toast styling: align toast border with status color (success green, error red, info blue) — currently all neutral.
- Command palette (Cmd+K): add a small "tip" footer showing keyboard shortcuts.

---

## Technical details

**Files touched (approximate):**
- `src/index.css` — add `.scrollbar-subtle` utility, focus-ring refinements, tabular-nums helper.
- `src/components/AppLayout.tsx` — apply scrollbar utility, clean active indicator, bump container max-width, allow per-page opt-out.
- `src/components/invoice/InvoiceLivePreview.tsx` — break-words description, larger base font, tabular-nums.
- `src/pages/Invoices.tsx`, `src/pages/Quotes.tsx`, `src/pages/CreditNotes.tsx` — replace pill scroller with tab + overflow dropdown filter; sticky table header; row-hover polish; empty states.
- `src/pages/CreateInvoice.tsx`, `src/pages/EditInvoice.tsx`, `src/pages/CreateQuote.tsx`, `src/pages/EditQuote.tsx` — `lg:block` for preview, full-width opt-out, sticky action bar, inline validation hints.
- `src/components/invoice/InvoiceLineItems.tsx` — empty-state row.
- Smaller tweaks across `src/pages/Overview.tsx`, `src/pages/Customers.tsx`, `src/pages/Products.tsx`, `src/pages/Reports.tsx` for spacing/typography consistency.

**No DB / backend changes.** No migrations. Pure UI work.

**Suggested order of execution:**
1. CSS utilities + sidebar scrollbar (foundational).
2. Status filter component refactor.
3. Live preview restoration + line-item layout fix.
4. App-wide spacing/typography pass.
5. Polish details (sticky bars, empty states, toast colors).

---

## Out of scope (call out separately if you want them)
- New features (e.g. dashboard widgets, new reports).
- Theme palette changes — keeping current Ocean/Slate/Forest themes as-is.
- Mobile-only redesigns beyond the table-to-card pattern already in place.
