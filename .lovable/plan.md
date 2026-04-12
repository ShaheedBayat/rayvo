

# UI/UX Audit — Senior Product Design Assessment

## Overall Impression
The app has a solid functional foundation but feels like a **2023-era MVP** rather than a premium 2027 SaaS product. The bones are good — the sidebar layout, color theming, and data structure are all competent. But the details, interactions, and visual refinement are where it falls short.

---

## 1. SIDEBAR NAVIGATION

**Issues:**
- The sidebar is visually flat — nav items are plain text links with no visual grouping beyond the "SALES" / "MANAGE" labels
- The "Invoices" submenu (Draft, Awaiting Payment, Paid, Overdue, Recurring Invoices) creates excessive clutter — these are filters, not pages. They belong as tabs/filters on the Invoices list page, not as sidebar navigation items
- No badge counts on nav items (e.g., "3 overdue", "2 drafts") — a missed opportunity for at-a-glance awareness
- The collapse button (<<) at the bottom feels disconnected
- Active state is just a filled background — no left border accent or icon highlight
- "Products & Services" is too long for a nav label; should be "Products" or "Catalog"

**What premium looks like:** Collapsible icon-only mode with tooltips, badge counters, subtle hover animations, grouped sections with collapsible headers

---

## 2. OVERVIEW / DASHBOARD PAGE

**Issues:**
- The status cards (Draft, Awaiting Payment, Overdue, Paid, Total) use colored left borders that look dated — feels like Bootstrap 3
- The monospace font (`JetBrains Mono`) on the financial summary cards (Outstanding R0.00, Received R1,000.00) feels jarring and out of place for a SaaS dashboard. Monospace should be reserved for invoice numbers and codes, not for currency displays
- "Recent Invoices" section is a single flat row — no hover state, no visual hierarchy
- "Customers Owing Most" shows "No outstanding balances" with no visual treatment — just plain text centered in a card
- No date range selector or time period filter for the overview data
- No sparklines or mini-charts in the summary cards
- No "welcome back" or contextual greeting
- The page feels static — no sense of real-time or freshness

**What premium looks like:** Animated counters, sparkline trends in cards, interactive date range picker, activity feed with timestamps, revenue trend chart

---

## 3. INVOICES LIST PAGE

**Issues:**
- The filter pills (All, Draft, Awaiting Approval, etc.) overflow horizontally without any scroll indicator or wrapping — "Deleted" is barely visible
- Too many filter states visible at once (9 pills) — should be a dropdown or collapsible
- The table is plain with no row hover effects visible
- The "..." menu only shows "View" — for a paid invoice this makes sense, but for draft invoices it should show Edit, Delete, Duplicate, etc.
- Invoice number uses monospace which is good, but the date below it creates an odd two-line cell
- No bulk actions (select multiple, bulk delete, bulk send)
- No sort indicators on column headers
- The "All Invoices" / "Recurring" tabs feel disconnected from the filter pills below

**What premium looks like:** Sortable columns with indicators, row hover with quick-action buttons, bulk selection checkboxes, inline status change, condensed/comfortable view toggle

---

## 4. CREATE INVOICE PAGE

**Issues:**
- The "Recurring" and "Deposit" toggles at the top feel like afterthoughts — they're just floating switches next to the title
- The two-column layout (Invoice Details + Bill To) is functional but the sections have no visual breathing room
- "INVOICE DETAILS" and "BILL TO" and "LINE ITEMS" use uppercase tracking that looks like 2018 form design
- The "Auto-generated on save" placeholder in Invoice Number is helpful but the grayed-out input looks disabled/broken
- Payment Terms dropdown is truncated ("Sele...") — the select component is too narrow
- The date input uses the native browser date picker which looks inconsistent across browsers
- Currency selector is separate from the amount display — should be integrated
- Line items table header ("DESCRIPTION QTY UNIT PRICE DISCOUNT AMOUNT") is cramped
- No live preview of the invoice while editing
- "Save as Draft" is the only primary action — should also show "Save & Send" prominently

**What premium looks like:** Split-pane with live invoice preview, inline product search with images, drag-to-reorder line items, auto-save indicator, step-based or wizard flow for first-time users

---

## 5. INVOICE VIEW PAGE

**Issues:**
- The action buttons (Email, Share, PDF, ...) are all on one line and compete for attention
- The "Paid in Full" banner is green but uses the same rounded style as everything else — should feel more celebratory or final
- The info cards (Customer, Issue Date, Due Date, Amount Due) use a dashed/light border that looks fragile
- The "Financial Summary" section and the actual invoice document below it create visual redundancy — the user sees the same amounts twice
- The invoice document preview has a teal top border that looks like a browser element, not part of the design
- Date format inconsistency: the info cards show "27 Mar 2026" but the invoice document shows "3/27/2026"

**What premium looks like:** Timeline/activity sidebar showing all events (created, sent, viewed, paid), consistent date formatting, a clear primary CTA based on invoice state, downloadable receipt for paid invoices

---

## 6. CUSTOMERS PAGE

**Issues:**
- The action icons (statement, edit, delete) are always visible — should appear on hover
- No customer avatar or initials circle
- The "Individual" badge is visually heavy compared to the "active" badge
- No quick-view/expand for customer details
- Phone number column is missing

**What premium looks like:** Avatar with initials, expandable row with recent activity, click-to-call/email links, customer health score or invoice summary

---

## 7. SETTINGS PAGE

**Issues:**
- The "Banking Details" section shows all fields as a single paragraph in a gray box — this should be structured as labeled fields (Bank Name, Account Number, Branch Code each on their own line)
- Theme selector cards are good but the "INTER" font label at the bottom of each card is meaningless to users — they don't know what "Inter" is
- "Open Invoice Settings" is a link to a separate page — this should be inline or tabbed within settings
- No profile/account section visible (name, email, password change)
- No danger zone (delete account, export data)

---

## 8. REPORTS PAGE

**Issues:**
- The summary cards (Total Revenue, Paid, Outstanding, Overdue) repeat the same pattern as the dashboard — feels like a copy-paste
- The charts (Income vs Expenses, Revenue by Month) are basic bar charts with no interactivity
- Y-axis labels show "1k, 1k, 1k, 0k, 0k" — clearly a rendering bug with duplicate tick labels
- No date range filter
- No ability to drill down into any number
- No export options per chart

---

## 9. GLOBAL ISSUES (Cross-cutting)

- **No loading skeletons**: Pages flash from empty to loaded with no transition
- **No keyboard shortcuts**: No Cmd+N for new invoice, no Cmd+K command palette
- **No breadcrumbs**: Navigation relies entirely on back arrows and sidebar
- **No empty state illustrations**: Empty pages show plain text with no visual personality
- **No toast positioning consistency**: Toasts appear but placement varies
- **Tables lack density controls**: No compact/comfortable/spacious toggle
- **No dark mode refinement**: The dark mode toggle exists but the dark palette likely needs polish for contrast and hierarchy
- **Monospace overuse**: `JetBrains Mono` is used for currency amounts throughout, making financial figures look like code output rather than business data
- **Status badges**: The colored rectangles (Paid, Active) are basic — should use subtle pill badges with icons
- **No onboarding for new users**: First-time experience just dumps you on the dashboard
- **The "+ New" dropdown** in the header still shows "New Recurring Invoice" as a separate option — this is redundant since recurring is a toggle on the create invoice page
- **No global search / command palette**: Missing Cmd+K or a search bar in the header

---

## 10. PRIORITY RANKING — What Would Move the Needle Most

1. **Command palette (Cmd+K)** — instant premium signal
2. **Sidebar badge counts + collapsible icon mode** — daily usability
3. **Remove monospace from currency; fix typography hierarchy** — visual polish
4. **Invoice list: sortable columns, row hover actions, bulk select** — power user efficiency
5. **Create Invoice: live preview pane, better form layout** — core workflow
6. **Dashboard: sparklines, date range filter, activity feed** — first impression
7. **Loading skeletons everywhere** — perceived performance
8. **Fix the Reports chart axis bug** — credibility
9. **Keyboard shortcuts** — power user retention
10. **Structured banking details in Settings** — attention to detail

