import React, { useEffect, useMemo, useState } from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import type { LocationTile } from '../types/war';
import { getHexByApiName, hexToLeafletBounds } from '../lib/hexLayout';
import { REPORT_UNAFFECTED_ICON_OPACITY } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import { getTownByApiName } from '../data/towns';

// Dynamically load all SVGs from src/map/subregions directory
const loadSubregionSvgs = async (): Promise<Record<string, string>> => {
  const svgs: Record<string, string> = {};
  
  // Use import.meta.glob to get all .svg files in the subregions directory
  const modules = import.meta.glob<string>('../map/subregions/*.svg', { as: 'url' });
  
  for (const [path, urlLoader] of Object.entries(modules)) {
    // Extract filename and convert to key (e.g., Kalokai.svg -> KalokaiHex)
    const filename = path.split('/').pop()?.replace(/\.svg$/, '') || '';
    const key = filename == "MarbanHollow" ? `${filename}` : `${filename}Hex`;
    
    const url = await urlLoader();
    svgs[key] = url;
  }
  
  return svgs;
};

let SUBREGION_SVGS_CACHE: Record<string, string> | null = null;

function ownerColor(owner: LocationTile['owner'] | undefined): string {
  switch (owner) {
    case 'Colonial':
      return 'rgba(60, 236, 75, 0.4)';
    case 'Warden':
      return 'rgba(47, 112, 198, 0.5)';
    case 'Neutral':
      return 'rgba(255, 255, 255, 0.9)'; // Neutral
    default:
      return 'rgba(255, 0, 0, 0.4)'; // Unknown
  }
}

interface Props {
  snapshot: { territories?: LocationTile[] } | undefined | null;
  changedDaily: Set<string>;
  changedWeekly: Set<string>;
  visible: boolean;
}

export default function TerritorySubregionLayer({ snapshot, changedDaily, changedWeekly, visible }: Props) {
  const map = useMap();
  const reportMode = useMapStore((s) => s.activeReportMode);
  /*
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);
*/

  // Ensure pane exists with deterministic stacking under markers/labels
  useEffect(() => {
    const paneId = 'territories-pane';
    if (!map.getPane(paneId)) {
      const pane = map.createPane(paneId);
      if (pane) pane.style.zIndex = '400';
    }
  }, [map]);

  // Load raw SVG text once per region
  const [svgByRegion, setSvgByRegion] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load SVG URLs from dynamic loader
      if (!SUBREGION_SVGS_CACHE) {
        SUBREGION_SVGS_CACHE = await loadSubregionSvgs();
      }
      const SUBREGION_SVGS = SUBREGION_SVGS_CACHE;
      
      console.log('[TerritorySubregion] Loading SVGs:', Object.keys(SUBREGION_SVGS));
      const entries = await Promise.all(
        Object.entries(SUBREGION_SVGS).map(async ([region, url]) => {
          try {
            const res = await fetch(url as string);
            if (!res.ok) {
              console.warn(`[TerritorySubregion] Failed to fetch ${region}: ${res.status}`);
              return [region, ''] as const;
            }
            const text = await res.text();
            console.log(`[TerritorySubregion] Loaded ${region}, size: ${text.length} bytes`);
            return [region, text] as const;
          } catch (e) {
            console.error(`[TerritorySubregion] Error loading ${region}:`, e);
            return [region, ''] as const;
          }
        })
      );
      if (!cancelled) {
        const next: Record<string, string> = {};
        entries.forEach(([region, text]) => {
          next[region] = text;
        });
        setSvgByRegion(next);
        console.log('[TerritorySubregion] SVGs loaded:', Object.keys(next));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build territory maps
  const territoryById = useMemo(() => {
    const map = new Map<string, LocationTile>();
    (snapshot?.territories ?? []).forEach((t) => map.set(t.id, t));
    console.log(`[TerritorySubregion] Built territoryById map with ${map.size} territories`);
    return map;
  }, [snapshot]);

  const changedSet = useMemo(() => {
    if (reportMode === 'daily') return changedDaily;
    if (reportMode === 'weekly') return changedWeekly;
    return null;
  }, [reportMode, changedDaily, changedWeekly]);

  // Render SVG overlays, recoloring paths by owning town/territory
  const overlays = useMemo(() => {
    const parser = new DOMParser();
    const processed: Array<JSX.Element> = [];

    console.log('[TerritorySubregion] Rendering overlays, svgByRegion keys:', Object.keys(svgByRegion));

    Object.entries(svgByRegion).forEach(([region, svgText]) => {
      if (!svgText) {
        console.warn(`[TerritorySubregion] Skipping ${region}: empty SVG`);
        return;
      }

      const hex = getHexByApiName(region);
      if (!hex) {
        console.warn(`[TerritorySubregion] No hex found for region: ${region}`);
        return;
      }
      const bounds = hexToLeafletBounds(hex);
      console.log(`[TerritorySubregion] Processing ${region}, bounds:`, bounds);

      const doc = parser.parseFromString(String(svgText), 'image/svg+xml');
      const root = doc.documentElement.cloneNode(true) as SVGSVGElement;

      const territoriesGroup = root.querySelector('#Territories');
      if (!territoriesGroup) {
        console.warn(`[TerritorySubregion] No <g id="Territories"> found in ${region}`);
        return;
      }

      const paths = Array.from(territoriesGroup.querySelectorAll<SVGPathElement>('path[id]'));
      console.log(`[TerritorySubregion] Found ${paths.length} territory paths in ${region}`);

      let matchedCount = 0;
      let unmatchedCount = 0;

      paths.forEach((p) => {
        const pathId = p.getAttribute('id');
        if (!pathId) return;

        // Find territory matching this path by looking through territories in this region
        console.log(`[TerritorySubregion] Processing path id=${pathId} in region=${region}`);
        const matchedTown = getTownByApiName(pathId);
        console.log(`[TerritorySubregion] Matched town (${matchedTown?.id ?? 'null'}) for pathId=${pathId}:`, matchedTown);
        
        if (!matchedTown) {
          console.warn(`[TerritorySubregion] No location match for path: region=${region}, pathId=${pathId}`);
          p.setAttribute('fill', '#d946ef');
          p.setAttribute('fill-opacity', '0.8');
          p.setAttribute('stroke', '#0f172a');
          p.setAttribute('stroke-width', '0.5');
          unmatchedCount++;
          return;
        }

        const territory = Array.from(territoryById.values()).find(
          (t) => t.region === region && `${region}-${t.x.toFixed(4)}-${t.y.toFixed(4)}` === matchedTown?.id
        );

        if (!territory) {
          console.warn(`[TerritorySubregion] No territory match for path: matchedTownId=${matchedTown?.id ?? 'null'}, pathId=${pathId}`);
          p.setAttribute('fill', '#9333ea');
          p.setAttribute('fill-opacity', '0.7');
          p.setAttribute('stroke', '#0f172a');
          p.setAttribute('stroke-width', '0.5');
          unmatchedCount++;
          return;
        }

        console.log(`[TerritorySubregion] Matched territory for pathId=${pathId}:`, territory);

        const owner = territory.owner;
        const color = ownerColor(owner);
        const highlighted = !!(changedSet && changedSet.has(territory.id));
        const opacity = reportMode ? (highlighted ? 0.9 : REPORT_UNAFFECTED_ICON_OPACITY) : 0.85;

        p.setAttribute('fill', color);
        p.setAttribute('fill-opacity', `${opacity}`);
        p.setAttribute('stroke', '#0f172a');
        p.setAttribute('stroke-width', '0.5');
        matchedCount++;
        console.log(`[TerritorySubregion] Set ${pathId} fill=${color} opacity=${opacity} owner=${owner}`);
      });

      console.log(`[TerritorySubregion] ${region}: ${matchedCount} matched, ${unmatchedCount} unmatched`);

      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(root);
      const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(serialized)}`;

      processed.push(
        <ImageOverlay
          key={region}
          bounds={bounds}
          url={encoded}
          opacity={1}
          pane="territories-pane"
          className="territory-subregions"
        />
      );
    });

    console.log(`[TerritorySubregion] Created ${processed.length} overlay elements`);
    return processed;
  }, [svgByRegion, territoryById, changedSet, reportMode]);

  if (!visible || !snapshot?.territories?.length) {
    if (!visible) console.log('[TerritorySubregion] Not rendering: visible=false');
    if (!snapshot?.territories?.length) console.log('[TerritorySubregion] Not rendering: no territories in snapshot');
    return null;
  }

  console.log('[TerritorySubregion] Rendering with overlays:', overlays.length);
  return <>{overlays}</>;
}
