import { ViewMode } from '../state/reports';

/**
 * Core styling and interaction rules for each ViewMode
 * Minimal set; additional styling (team colors, strokes, labels, etc.) remains in components
 */
export interface ViewModeRules {
  // Territory opacity/visibility
  territory: {
    normalOpacity: number;
    unaffectedOpacity: number;
    affectedOpacity: number;
    applyGrayscale: boolean;  // For unaffected territories in territoryDimming mode
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
          normalOpacity: 0.3,
          unaffectedOpacity: 0.25,
          affectedOpacity: 0.7,
          applyGrayscale: true,
        },
        mapIcon: {
          visibleAtMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 0.35,
        },
        interaction: {
          restrictHoverToAffected: true,
          restrictClickToAffected: true,
        },
      };

    case 'minimal':
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          applyGrayscale: false,
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
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          applyGrayscale: false,
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
