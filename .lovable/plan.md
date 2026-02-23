

# Finalize System and Simplify Themes

## Part 1: Simplify Theme System (4 color options)

The current 8-theme system is overengineered and several themes have visual issues. We'll simplify to **4 clean color options**, all following the same proven structure as Ocean (dark-tinted sidebar in light mode, matching dark equivalent in dark mode).

### The 4 Themes

| Theme | Accent Color | Sidebar (Light) | Sidebar (Dark) | Font |
|-------|-------------|-----------------|-----------------|------|
| **Ocean** (keep as-is) | Teal `192 75% 36%` | Dark teal `192 45% 18%` | Darker teal `192 35% 10%` | Inter |
| **Slate** (replace Corporate) | Blue-gray `215 20% 46%` | Dark slate `215 25% 16%` | Darker slate `215 22% 8%` | Inter |
| **Forest** (replace Editorial) | Green `152 45% 38%` | Dark green `152 30% 16%` | Darker green `152 25% 8%` | Inter |
| **Berry** (replace Creative) | Purple-pink `280 50% 52%` | Dark purple `280 30% 16%` | Darker purple `280 25% 8%` | Inter |

**Key design principles:**
- All themes use **Inter** font (consistent, professional)
- All themes use the same **0.5rem border radius**
- Light mode: dark-tinted sidebar (like Ocean currently looks)
- Dark mode: sidebar uses a darker shade of the same accent color family (not generic gray)
- No special overrides (no brutalist forced edges, no glassmorphism, no neon glows)
- Clean, consistent, professional across all 4

### Files to Modify

**`src/index.css`** -- Replace all 8 theme definitions with 4 clean ones. Remove ALL theme-specific override CSS at the bottom (brutalist sharp edges, editorial card gradients, creative sidebar gradients, midnight glassmorphism, cyber neon glow, rose transitions, corporate left borders). Keep only the base layer and utility classes.

**`src/hooks/useTheme.tsx`** -- Update `ColorTheme` type to `'ocean' | 'slate' | 'forest' | 'berry'`. Update `colorThemes` array to 4 entries. Add migration map for old theme names (corporate -> slate, editorial -> forest, creative -> berry, midnight/brutalist/rose/cyber -> ocean).

**`src/pages/SettingsPage.tsx`** -- No structural changes needed (it reads from `colorThemes` array dynamically). The grid will naturally show 4 cards instead of 8.

---

## Part 2: Final Quality Checks and Fixes

Based on thorough review of the codebase, here are remaining issues to address:

### Fix 1: Activity logging on entity creation
Currently `addInvoice`, `addQuote`, and `addCreditNote` in `useInvoiceStore.ts` do not log a "created" activity. Only status changes log activity. This was identified previously but may not have been fully implemented.

**File:** `src/hooks/useInvoiceStore.ts` -- Verify and ensure `logActivity` is called after successful creation of invoices. (If already done, skip.)

### Fix 2: Remove unused theme override CSS
The bottom of `index.css` (lines 772-860) has structural overrides for themes being removed (brutalist, editorial, creative, midnight, cyber, rose, corporate). These will be deleted as part of the theme simplification.

### Fix 3: Clean up font imports
`index.css` line 5 imports 9 Google Fonts families. After simplification, we only need Inter and JetBrains Mono (for code/mono display). Remove DM Serif Display, Space Grotesk, Playfair Display, Sora, Outfit, Crimson Pro, and IBM Plex Mono.

---

## Summary of Changes

| File | What Changes |
|------|-------------|
| `src/index.css` | Replace 8 theme CSS blocks with 4 clean ones. Remove all theme-specific override CSS. Trim font imports to Inter + JetBrains Mono. |
| `src/hooks/useTheme.tsx` | Update ColorTheme type and colorThemes array to 4 themes. Add migration for removed theme names. |
| `src/pages/SettingsPage.tsx` | No changes needed (reads dynamically from colorThemes). |

No database changes required. No new files needed.

