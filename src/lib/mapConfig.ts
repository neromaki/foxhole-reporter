// Map display configuration constants
export const MAP_MIN_ZOOM = -2;           // Minimum zoom level for the map (allow farther zoom-out)
export const MAP_MAX_ZOOM = 3;              // Maximum zoom level for the map

// Auto-show/hide overlays at zoom levels
export const MINOR_LABEL_MIN_ZOOM = 3; // Minor labels appear at or above this zoom level
export const MAJOR_LABEL_MIN_ZOOM = 0.5; // Major labels appear at or above this zoom level
export const CASUALTIES_MAX_ZOOM = MAP_MAX_ZOOM; // Casualty overlays appear at or below this zoom level
export const MAP_MARKER_MIN_ZOOM = MAP_MIN_ZOOM + 0.1;

// Data source configuration - change this to switch between WarAPI (live) and Supabase (snapshots)
export type DataSourceType = 'warapi' | 'supabase' | 'disabled';
export const DATA_SOURCE: DataSourceType = 'supabase'; // 'warapi' for live data, 'supabase' for stored snapshots

export const ZOOM_THROTTLE_MS = 100; // Only used when mode is 'throttle'

// Debug performance overlay flag
export const DEBUG_PERF_OVERLAY = false; // set false to disable runtime perf panel
export const DEBUG_ZOOM = false; // Show current zoom level 


// Reports
export const TERRITORY_SATURATION_OVERVIEW = 20;
export const TERRITORY_BRIGHTNESS_OVERVIEW = 0;
export const TERRITORY_OPACITY_OVERVIEW = 0.7;

export const TERRITORY_SATURATION_NORMAL = 20;
export const TERRITORY_BRIGHTNESS_NORMAL = 0;
export const TERRITORY_OPACITY_NORMAL = 0.35;

export const TERRITORY_SATURATION_REPORT_UNAFFECTED = 0;
export const TERRITORY_BRIGHTNESS_REPORT_UNAFFECTED = 0;
export const TERRITORY_OPACITY_REPORT_UNAFFECTED = 0.25;

export const TERRITORY_SATURATION_REPORT_AFFECTED = 10;
export const TERRITORY_BRIGHTNESS_REPORT_AFFECTED = 10;
export const TERRITORY_OPACITY_REPORT_AFFECTED = 0.7;

export const TERRITORY_SATURATION_REPORT_HIGHLIGHTED = 0;
export const TERRITORY_BRIGHTNESS_REPORT_HIGHLIGHTED = 0
export const TERRITORY_OPACITY_REPORT_HIGHLIGHTED = 0.8;

export const TERRITORY_SATURATION_ACTIVE_MODIFIER = 1.5;
export const TERRITORY_BRIGHTNESS_ACTIVE_MODIFIER = 4;
export const TERRITORY_OPACITY_ACTIVE_MODIFIER = 2;

export const TERRITORY_SATURATION_HIGHLIGHT_1 = 50;
export const TERRITORY_BRIGHTNESS_HIGHLIGHT_1 = -20;

export const TERRITORY_SATURATION_HIGHLIGHT_2 = 10;
export const TERRITORY_BRIGHTNESS_HIGHLIGHT_2 = -10;


// Victory bar display
export const WARSTATE_GRAPH_SHOW_NEUTRAL = false;
export const WARSTATE_GRAPH_SHOW_SCORCHED = false;

// Click detection - distance threshold to differentiate clicks from panning/dragging (in pixels)
export const CLICK_DISTANCE_THRESHOLD = 5;
