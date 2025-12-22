import React, { useMemo } from 'react';
import { LayerGroup, Marker, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getHexByApiName, HEX_LAYOUT, hexToLeafletBounds } from '../lib/hexLayout';
import { MAP_MIN_ZOOM } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import { WarReport } from '../types/war';


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

function CasualtyLayer({
  reports,
  previousReports,
  currentTimestamp,
  previousTimestamp,
  visible,
}: {
  reports: WarReport[] | undefined;
  previousReports: WarReport[] | undefined;
  currentTimestamp: number | null | undefined;
  previousTimestamp: number | null | undefined;
  visible: boolean;
}) {
  const rateMap = useMemo(() => computeCasualtyRates(reports, previousReports, currentTimestamp, previousTimestamp), [reports, previousReports, currentTimestamp, previousTimestamp]);

  if (!visible || !reports || reports.length === 0) return null;

  return (
    <LayerGroup>
      {reports.map((report) => {
        const hex = getHexByApiName(report.region);
        if (!hex) return null;
        const [[south, west], [north, east]] = hexToLeafletBounds(hex);
        const lat = (south + north) / 2;
        const lng = (west + east) / 2;
        const rate = rateMap.get(report.region);
        if (!rate) return null;
        return (
          <Marker
            key={`casualty-${report.region}`}
            position={[lat, lng] as [number, number]}
            icon={casualtyMarkerIcon(rate)}
            interactive={false}
          />
        );
      })}
    </LayerGroup>
  );
}

export default CasualtyLayer;