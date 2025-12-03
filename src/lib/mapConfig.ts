// Map display configuration constants
export const MINOR_LABEL_MIN_ZOOM = 3; // Minor labels appear at or above this zoom level
export const MAJOR_LABEL_MIN_ZOOM = 1; // Major labels appear at or above this zoom level
export const MAP_MIN_ZOOM = 0;         // Minimum zoom level for the map
export const MAP_MAX_ZOOM = 3;        // Maximum zoom level for the map

// Data source configuration - change this to switch between WarAPI (live) and Supabase (snapshots)
export type DataSourceType = 'warapi' | 'supabase';
export const DATA_SOURCE: DataSourceType = 'supabase'; // 'warapi' for live data, 'supabase' for stored snapshots

export const SHOW_DAILY_REPORT = true;  // Whether to show daily territory change report
export const SHOW_WEEKLY_REPORT = false; // Whether to show weekly territory change report

// Icon update strategy: 'zoomend' (best performance) or 'throttle' (live scaling)
export type ZoomIconUpdateMode = 'zoomend' | 'throttle';
export const ZOOM_ICON_UPDATE_MODE: ZoomIconUpdateMode = 'zoomend';
export const ZOOM_THROTTLE_MS = 100; // Only used when mode is 'throttle'

// Smooth visual scaling of icons using CSS transform rather than recreating icons per zoom.
// When enabled, we create each icon at its max-zoom size and apply a transform scale for lower zooms.
export const ICON_SMOOTH_SCALE = true;
export const ICON_SMOOTH_DURATION_MS = 25; // ms for transition easing

// Debug performance overlay flag
export const DEBUG_PERF_OVERLAY = true; // set false to disable runtime perf panel

// Reports
export const REPORT_UNAFFECTED_ICON_OPACITY = 0.25; // Opacity for unaffected icons in report mode