import { MapIcon, MapIconTag } from '../data/map-icons';
import { LayerState } from './layers';

// Type definitions
export type ViewMode = 'territoryDimming' | 'minimal' | 'none';
export type ReportSource = 'builtin' | 'user';
export type FilterMode = 'ANY' | 'ALL';

/**
 * Specification for a single report
 */
export interface ReportSpec {
  id: string;                    // Unique identifier (e.g., 'logistics-frontline', 'threats-storm')
  name: string;                  // Display name (e.g., 'Logistics (Frontline)', 'Storm Cannons')
  category: string;              // Primary category (e.g., 'Territory', 'Threats', 'Job Views')
  subcategory?: string;          // Optional secondary grouping (e.g., 'Resource Mining', 'Logistics')
  mapIconTags: MapIconTag[];     // MapIcon tags to filter/show (empty = show no icons)
  filterMode?: FilterMode;       // 'ANY' (default): any tag matches; 'ALL': all tags must match
  viewMode: ViewMode;            // Visual presentation mode
  defaultLayers: LayerState;     // Complete desired layer state when report activates
  reportContextGroup?: string;   // Group for context-aware report switching (e.g., 'territory', 'threats', 'jobs-mining')
  metadata?: {                   // Optional extensible metadata for future features
    stackComparisonIcons?: MapIcon[];  // For threats reports: which icons to show in VictoryBar
    [key: string]: any;           // Allow arbitrary future metadata
  };
  source: ReportSource;          // 'builtin' (immutable) or 'user' (from localStorage)
}

/**
 * Built-in reports registry
 * Maps report IDs to complete ReportSpec definitions
 */
export const BUILTIN_REPORTS: Record<string, ReportSpec> = {
  // Territory Reports (map to territory_diffs table periods: daily, threeDay, weekly, allTime)
  'territory-daily': {
    id: 'territory-daily',
    name: '1 Day',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-three-day': {
    id: 'territory-three-day',
    name: '3 Days',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-weekly': {
    id: 'territory-weekly',
    name: '7 Days',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-all-time': {
    id: 'territory-all-time',
    name: 'All Time',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  // Threats Reports
  'threats-storm': {
    id: 'threats-storm',
    name: 'Storm Cannons',
    category: 'Threats',
    mapIconTags: [MapIconTag.Coastal_Gun],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: true, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'threats',
    metadata: { stackComparisonIcons: [MapIcon.Coastal_Gun] },
    source: 'builtin',
  },
  'threats-rocket': {
    id: 'threats-rocket',
    name: 'Rockets',
    category: 'Threats',
    mapIconTags: [MapIconTag.Rocket_Structure],  // Matches Rocket_Site and Rocket_Site_With_Rocket
    viewMode: 'territoryDimming',
    defaultLayers: { structures: true, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'threats',
    metadata: { stackComparisonIcons: [MapIcon.Rocket_Site] },
    source: 'builtin',
  },
  // Job Views - Resource Mining
  'job-salvage-miner': {
    id: 'job-salvage-miner',
    name: 'Salvage Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Salvage, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-component-miner': {
    id: 'job-component-miner',
    name: 'Component Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Component, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-sulfur-miner': {
    id: 'job-sulfur-miner',
    name: 'Sulfur Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Sulfur, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-coal-miner': {
    id: 'job-coal-miner',
    name: 'Coal Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Coal],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-oil-miner': {
    id: 'job-oil-miner',
    name: 'Oil Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Oil],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  // Job Views - Logistics
  'job-logi-frontline': {
    id: 'job-logi-frontline',
    name: 'Logistics (Frontline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Storage],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  'job-logi-midline': {
    id: 'job-logi-midline',
    name: 'Logistics (Midline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Logistics],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  'job-logi-backline': {
    id: 'job-logi-backline',
    name: 'Logistics (Backline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Logistics, MapIconTag.Production],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  // Job Views - Production
  'job-factory': {
    id: 'job-factory',
    name: 'Factory',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Production],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-vehicles': {
    id: 'job-vehicles',
    name: 'Vehicles',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Vehicle_Factory],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-naval': {
    id: 'job-naval',
    name: 'Naval',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Shipyard],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-yard': {
    id: 'job-yard',
    name: 'Yard',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Construction_Yard],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
};

/**
 * Get all reports (built-in + user)
 * User reports are loaded from localStorage (future implementation)
 */
export function getAllReports(): ReportSpec[] {
  // TODO: Load user reports from localStorage when user report feature is implemented
  // const userReports = loadUserReports();
  const userReports: ReportSpec[] = [];
  
  return [
    ...Object.values(BUILTIN_REPORTS),
    ...userReports,
  ];
}

/**
 * Get a single report by ID (searches built-in and user reports)
 */
export function getReport(id: string): ReportSpec | undefined {
  return BUILTIN_REPORTS[id] ?? getAllReports().find(r => r.id === id);
}

/**
 * Generate a filter function for MapIcon tags based on report filterMode
 * Returns null if no icon filtering should be applied (empty tag list)
 */
export function getReportMapIconFilter(report: ReportSpec): ((iconTags: MapIconTag[]) => boolean) | null {
  if (report.mapIconTags.length === 0) return null;  // No icon filtering
  
  const filterMode = report.filterMode ?? 'ANY';
  
  if (filterMode === 'ALL') {
    // All tags must be present in the icon
    return (iconTags: MapIconTag[]) =>
      report.mapIconTags.every(tag => iconTags.includes(tag));
  } else {
    // (ANY mode) At least one tag must match
    return (iconTags: MapIconTag[]) =>
      report.mapIconTags.some(tag => iconTags.includes(tag));
  }
}
