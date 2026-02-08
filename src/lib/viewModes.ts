import { ViewMode } from '../state/reports';

/**
 * Core styling and interaction rules for each ViewMode
 * Minimal set; additional styling (team colors, strokes, labels, etc.) remains in components
 */
export interface ViewModeRules {
  // Territory opacity/visibility
  territory: {
    unaffectedOpacity: number;
    unaffectedSaturation: number;
    unaffectedBrightness: number;

    affectedOpacity: number;
    affectedSaturation: number;
    affectedBrightness: number;
  };
  // MapIcon visibility
  mapIcon: {
    visibleAtMinZoom: boolean;  // Show icons at MAP_MARKER_MIN_ZOOM?
    affectedOpacity: number;
    unaffectedOpacity: number;
  };
  // Interaction restrictions
  interaction: {
    restrictHoverToAffected: boolean;
    restrictClickToAffected: boolean;
  };
}

/**
 * Get the ViewMode rules for a given mode
 */
export function getViewModeRules(viewMode: ViewMode): ViewModeRules {
  switch (viewMode) {
    case 'territoryDimming':
      return {
        territory: {
          unaffectedOpacity: 0.25,
          unaffectedSaturation: 0,
          unaffectedBrightness: -50,
          affectedOpacity: 0.7,
          affectedSaturation: 20,
          affectedBrightness: 10,
        },
        mapIcon: {
          visibleAtMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: true,
          restrictClickToAffected: true,
        },
      };

    case 'minimal':
      return {
        territory: {
          unaffectedOpacity: 0.3,
          unaffectedSaturation: 10,
          unaffectedBrightness: 0,
          affectedOpacity: 0.3,
          affectedSaturation: 10,
          affectedBrightness: 10,
        },
        mapIcon: {
          visibleAtMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
      };

    case 'none':
    default:
      return {
        territory: {
          unaffectedOpacity: 0.3,
          unaffectedSaturation: 10,
          unaffectedBrightness: 0,
          affectedOpacity: 0.3,
          affectedSaturation: 10,
          affectedBrightness: 10,
        },
        mapIcon: {
          visibleAtMinZoom: false,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
      };
  }
}
