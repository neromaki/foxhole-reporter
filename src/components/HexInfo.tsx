import React, { useMemo } from 'react';
import { LayerGroup, Marker, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getHexByApiName, HEX_LAYOUT, hexToLeafletBounds } from '../lib/hexLayout';
import { MAP_MIN_ZOOM } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import HexNameLabels from './HexNameLabels';
import HexCasualties from './HexCasualties';
import { WarReport } from '../types/war';
import { getTeamData } from '../data/teams';
import { MAJOR_LABEL_MIN_ZOOM, CASUALTIES_MAX_ZOOM } from '../lib/mapConfig';

export default function HexInfo({
  reports,
  previousReports,
  currentTimestamp,
  previousTimestamp,
  casualtiesVisible,
}: {
  reports: WarReport[] | undefined;
  previousReports: WarReport[] | undefined;
  currentTimestamp: number | null | undefined;
  previousTimestamp: number | null | undefined;
  casualtiesVisible: boolean;
}) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  const disabledHexes = useMapStore((s) => s.disabledHexes);

  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  const Colonials = getTeamData('Colonial');
  const Wardens = getTeamData('Warden');

 const rateMap = useMemo(() => computeCasualtyRates(reports, previousReports, currentTimestamp, previousTimestamp), [reports, previousReports, currentTimestamp, previousTimestamp]);

  return (
    <LayerGroup>
      <Pane name="hex-info-pane" style={{ zIndex: zoom < MAJOR_LABEL_MIN_ZOOM ? 600 : 200 }} />
      {HEX_LAYOUT.map((hex) => {
        // Get hex bounds and center
        const [[south, west], [north, east]] = hexToLeafletBounds(hex);
        const centerLat = (south + north) / 2;
        const centerLng = (west + east) / 2;
        const isDisabled = disabledHexes.has(hex.apiName);
        // Hex name label
        const nameLabelHtml = `<span style="${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'text-shadow: none' : ''}">${hex.displayName}</span>`;
        const nameLabelClassName = `hex-name-label map-label z-[100] text-center text-[16px] ${zoom < MAJOR_LABEL_MIN_ZOOM ? 'text-gray-100 font-bold' : 'text-[40px] text-gray-100/40 font-extrabold'} ${isDisabled ? 'text-gray-400/40 font-normal' : ''} whitespace-nowrap`;
        // Hex casualties
        let hexReport = null;
        let casualtyLabelHtml = '';
        if (casualtiesVisible && reports && zoom <= CASUALTIES_MAX_ZOOM) {
          hexReport = reports.find((report) => report.region === hex.apiName);
          if (hexReport) {
            const rate = rateMap.get(hexReport.region);
            if (rate) {
              const w = Math.round(rate.warden);
              const c = Math.round(rate.colonial);
              const prefix = rate.source === 'delta' ? '' : 'Avg ';
              casualtyLabelHtml = `
                <div style="display:flex;flex-direction:column;align-items:center;text-align:left;font-weight:semi-bold;font-size:1rem;">
                  <div style="display:flex;align-items:center">
                    <img src="${Colonials?.icon}" alt="Colonial" style="height:1rem;width:1rem;margin-right:0.25rem" />
                    <div>
                      <span style="margin-right:0.1rem;font-weight:normal;">${c}</span>
                      <span style="font-weight:normal;font-size:0.75rem">/hr</span>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center">
                    <img src="${Wardens?.icon}" alt="Warden" style="height:1rem;width:1rem;margin-right:0.25rem" />
                    <div>
                      <span style="margin-right:0.1rem;font-weight:normal;">${w}</span>
                      <span style="font-weight:normal;font-size:0.75rem">/hr</span>
                    </div>
                  </div>
                </div>`;
            }
          }
        }

        const icon = L.divIcon({
          className: `${nameLabelClassName}`,
          html: `<div style="display:inline-block;">${nameLabelHtml}${casualtyLabelHtml}</div>`,
          iconSize: [east - west, 30]
        });
        return (
          <Marker
            key={`hex-center-${hex.apiName}`}
            position={[centerLat, centerLng]}
            icon={icon}
            interactive={false}
            pane="hex-info-pane"
          />
        );
      })}
    </LayerGroup>
  );
}

type CasualtyRate = { warden: number; colonial: number; source: 'delta' | 'avg' };

function computeCasualtyRates(
  currentReports: WarReport[] | undefined,
  previousReports: WarReport[] | undefined,
  currentTimestamp: number | null | undefined,
  previousTimestamp: number | null | undefined
): Map<string, CasualtyRate> {
  const rates = new Map<string, CasualtyRate>();
  if (!currentReports || currentReports.length === 0) return rates;

  const prevByRegion = new Map<string, WarReport>();
  (previousReports ?? []).forEach((r) => prevByRegion.set(r.region, r));

  const dtHours = currentTimestamp != null && previousTimestamp != null
    ? Math.max((currentTimestamp - previousTimestamp) / 3_600_000, 0)
    : null;

  currentReports.forEach((curr) => {
    const prev = prevByRegion.get(curr.region);
    if (prev && dtHours && dtHours > 0) {
      const warden = Math.max(0, (curr.wardenCasualties - prev.wardenCasualties) / dtHours);
      const colonial = Math.max(0, (curr.colonialCasualties - prev.colonialCasualties) / dtHours);
      rates.set(curr.region, { warden, colonial, source: 'delta' });
    } else {
      const hours = curr.dayOfWar * 24;
      const warden = hours > 0 ? curr.wardenCasualties / hours : 0;
      const colonial = hours > 0 ? curr.colonialCasualties / hours : 0;
      rates.set(curr.region, { warden, colonial, source: 'avg' });
    }
  });

  return rates;
}

function casualtyMarkerIcon(rate: CasualtyRate) {
  const w = Math.round(rate.warden);
  const c = Math.round(rate.colonial);
  const prefix = rate.source === 'delta' ? '' : 'Avg ';
  return L.divIcon({
    className: 'casualty-rate-icon',
    html: `<div style="padding:6px 8px;border-radius:6px;background:rgba(0,0,0,0.65);color:#e5e7eb;font-size:11px;line-height:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4);backdrop-filter:blur(2px);white-space:nowrap;">
      ${prefix}W: ${w}/hr&nbsp;•&nbsp;C: ${c}/hr
    </div>`,
    iconSize: [120, 32],
    iconAnchor: [60, 0],
  });
}
