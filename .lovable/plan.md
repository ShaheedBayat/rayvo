
# Fix Theme Sidebar Visibility

## Problem
All 4 theme sidebars look virtually identical in light mode. The sidebar backgrounds use very dark colors (16-18% lightness) with low-medium saturation, making them indistinguishable from each other. Dark mode fares better (Berry's purple sidebar was clearly visible) but still needs tuning.

## Root Cause
The sidebar background HSL values are too similar:
- Ocean: `192 45% 18%` (dark teal)
- Slate: `215 25% 16%` (dark blue-gray) -- looks the same
- Forest: `152 30% 16%` (dark green) -- looks the same
- Berry: `280 30% 16%` (dark purple) -- looks the same

At 16% lightness, the color differences are invisible to the human eye unless saturation is very high.

## Solution
Increase saturation significantly for each theme's sidebar so colors are clearly distinguishable, while keeping the same professional dark-sidebar aesthetic that Ocean established.

### Updated Sidebar Colors (Light Mode)

| Theme | Current | Fixed |
|-------|---------|-------|
| **Ocean** | `192 45% 18%` | Keep as-is (already looks good) |
| **Slate** | `215 25% 16%` | `215 40% 20%` (noticeably blue) |
| **Forest** | `152 30% 16%` | `152 50% 16%` (clearly green) |
| **Berry** | `280 30% 16%` | `280 45% 18%` (clearly purple) |

### Updated Sidebar Colors (Dark Mode)

| Theme | Current | Fixed |
|-------|---------|-------|
| **Ocean** | `192 35% 10%` | Keep as-is |
| **Slate** | `215 22% 8%` | `215 35% 10%` |
| **Forest** | `152 25% 8%` | `152 40% 9%` |
| **Berry** | `280 25% 8%` | `280 40% 10%` |

Also update the matching sidebar-accent, sidebar-border, and sidebar-ring values to use the same increased saturation for consistency.

## Files to Modify

**`src/index.css`** -- Update the sidebar-related CSS variables for Slate, Forest, and Berry themes (both light and dark mode blocks). Specifically:
- `--sidebar-background`
- `--sidebar-accent`
- `--sidebar-border`
- `--sidebar-ring`
- `--sidebar-primary`

No other files need changes. The tailwind config and theme hooks are correct.
