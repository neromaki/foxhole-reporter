# Dual Tooltip Plan (Hover + Selected)

## Goals
- Keep a shared tooltip mechanism for performance, but support two simultaneous tooltips: a hover/preview tooltip and a selected tooltip.
- Ensure the selected tooltip persists after clicking/tapping a MapIcon or Territory until selection is cleared (panel close, ESC, or new selection), while hover tooltips remain ephemeral.
- Centralize tooltip content building in one place to avoid duplication.

## User Experience
- Desktop: Hover shows a hover tooltip; click selects and shows a selected tooltip that stays visible. Hovering a non-selected item should not close the selected tooltip. Hovering the already-selected item suppresses the hover tooltip (selected remains).
- Mobile/touch: No hover tooltips. Tapping selects, pans (existing behavior), and shows the selected tooltip.
- Report mode: Hover tooltips are limited to highlighted territories only; selected tooltip always persists regardless of highlight status.
- ESC: Closes the info panel and clears `selectedLocation`, which hides the selected tooltip after 250ms (panel transition). Hover tooltips are unaffected by ESC.

## Technical Approach (Option 2: Single Provider, Dual Instances)
- Refactor `src/lib/sharedTooltip.tsx` to manage two Leaflet tooltip instances internally: `hover` and `selected`.
- Expose an API such as:
  - `show(type: 'hover' | 'selected', { html, lat, lng, openDelay?, sticky?, interactive?, className? })`
  - `hide(type: 'hover' | 'selected', closeDelay?)`
  - `hideAll(closeDelay?)` (used by ESC/panel close if needed)
  - `refresh(type, payload)` to update content/position without tearing down.
  - Optional `bringToFront(type)` or apply higher z-index class for the selected tooltip (`shared-tooltip-selected`).
- Each tooltip keeps its own open/close timers and event listeners (`mouseenter` cancels close; `mouseleave` schedules close when not sticky). Clean up on unmount.
- Add a global ESC listener inside the provider: on ESC, close info panel, clear `selectedLocation`, and hide the selected tooltip after 250ms; do not affect hover tooltip.
- Stacking: Ensure selected tooltip renders above hover (CSS class or `bringToFront`).

## Content Builder
- Centralize a single builder in `sharedTooltip`, e.g., `buildTooltipContent({ platform, action, source, data })` that returns HTML string.
  - `platform`: `mobile` | `desktop`
  - `action`: `hover` | `selected`
  - `source`: `mapIcon` | `territory`
  - `data`: includes location/tile/town info, ownership, history, diff flags, etc.
- Use this builder from both `MapView` (LocationsLayer) and `TerritorySubregionLayer` to remove current duplication.
- Auto-refresh: when `selectedLocation` data changes (owner/name), call `refresh('selected', payload)`.

## Call-Site Wiring
- `MapView` / `LocationsLayer`:
  - Hover: `show('hover', ...)` on mouse over; `hide('hover')` on leave. Suppress hover when the hovered item is currently selected.
  - Select (click/tap): set `selectedLocation`, open info panel, and `show('selected', ...)`. On deselect or panel close, `hide('selected', 250)`.
  - In report mode markers are already hidden; no hover.
- `TerritorySubregionLayer`:
  - Hover: only if (a) not touch, (b) report mode => only highlighted territories; otherwise normal hover. Call `show('hover', ...)` / `hide('hover')` with suppression when hovering the selected item.
  - Select: on click/tap, set `selectedLocation`, open panel, pan on touch, then `show('selected', ...)`; hide with deselect/panel close/ESC.
- Suppress hover tooltip when hovering the already-selected location; selected tooltip stays.

## Lifecycle & Dismissal
- Selected tooltip hides when:
  - Info panel closes (after 250ms transition) or `selectedLocation` is cleared.
  - A new location is selected (immediate replace/show new selected tooltip).
  - ESC is pressed (clears selection/panel, hides selected after 250ms).
- Hover tooltip remains ephemeral and unaffected by ESC.

## Performance Considerations
- Only two tooltip instances are created; reuse them via the provider (no per-marker/per-path tooltip allocations).
- Preserve existing icon caching, viewport culling, and SVG overlay behaviors; changes are scoped to tooltip lifecycle and content.
- Keep open/close delays (small) to avoid flicker; ensure listener cleanup to prevent leaks.

## Implementation Prompt
"Implement Option 2 dual-tooltips. In `src/lib/sharedTooltip.tsx`, manage two Leaflet tooltips (`hover`, `selected`) with APIs `show(type, payload)`, `hide(type, delay)`, `hideAll`, `refresh`, and ensure selected tooltip stacks above hover. Add an ESC handler to clear selection/panel and hide selected after 250ms. Centralize `buildTooltipContent({ platform, action, source, data })` in `sharedTooltip`. Update `MapView`/`LocationsLayer` and `TerritorySubregionLayer` to use `show('hover'| 'selected')/hide(...)`, suppress hover when hovering the selected item, limit hover to highlighted territories in report mode, and keep mobile behavior (only selected tooltip on tap + pan). Ensure selected tooltip hides on panel close or selection clear (250ms delay) and refreshes on data changes (ownership/name)."