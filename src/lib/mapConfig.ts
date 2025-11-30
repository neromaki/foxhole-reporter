// Map display configuration constants
export const MINOR_LABEL_MIN_ZOOM = 3; // Minor labels appear at or above this zoom level
export const MAJOR_LABEL_MIN_ZOOM = 5; // Major labels appear at or above this zoom level
export const MAP_MIN_ZOOM = 0;         // Minimum zoom level for the map
export const MAP_MAX_ZOOM = 3;        // Maximum zoom level for the map

// Data source configuration - change this to switch between WarAPI (live) and Supabase (snapshots)
export type DataSourceType = 'warapi' | 'supabase';
export const DATA_SOURCE: DataSourceType = 'supabase'; // 'warapi' for live data, 'supabase' for stored snapshots

export const SHOW_DAILY_REPORT = false;  // Whether to show daily territory change report
export const SHOW_WEEKLY_REPORT = false; // Whether to show weekly territory change report