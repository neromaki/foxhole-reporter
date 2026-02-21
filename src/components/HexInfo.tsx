import React from 'react';
import { LayerGroup, Marker, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getHexByApiName, HEX_LAYOUT, hexToLeafletBounds } from '../lib/hexLayout';
import { MAP_MIN_ZOOM } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import HexNameLabels from './HexNameLabels';
import HexCasualties from './HexCasualties';
import { getTeamData } from '../data/teams';
import { MAJOR_LABEL_MIN_ZOOM, CASUALTIES_MAX_ZOOM } from '../lib/mapConfig';
import type { useCasualtyRates } from '../lib/hooks/useCasualtyRates';
import { isMobilePortrait } from '../lib/devices';
import tinycolor from 'tinycolor2';

export default function HexInfo({
  casualtyRates,
  casualtiesVisible,
  labelsVisible
}: {
  casualtyRates: ReturnType<typeof useCasualtyRates>;
  casualtiesVisible: boolean;
  labelsVisible: boolean;
}) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  const disabledHexes = useMapStore((s) => s.disabledHexes);
  const reportModeActive = useMapStore((s) => s.activeReport !== null);

  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  const Colonials = getTeamData('Colonial');
  const Wardens = getTeamData('Warden');

  const isPortrait = isMobilePortrait();
  const portraitZoomThreshold = -1;

  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }

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
        const nameLabelClassName = `hex-name-label map-label z-[100] text-center text-[16px] ${zoom < MAJOR_LABEL_MIN_ZOOM ? 'text-gray-100 font-bold' : 'text-[40px] text-gray-100/40 font-extrabold'} ${isPortrait && zoom < portraitZoomThreshold ? 'text-[8px]' : ''} ${isDisabled ? 'text-gray-400/40 font-normal' : ''} whitespace-nowrap`;
        // Hex casualties
        let casualtyLabelHtml = '';
        if (casualtiesVisible && !reportModeActive && zoom <= CASUALTIES_MAX_ZOOM) {
          const rate = casualtyRates.getRate(hex.apiName);
          if (rate) {
            const wardenRate = Math.round(rate.warden);
            const colonialRate = Math.round(rate.colonial);
            const totalRate = wardenRate + colonialRate;
            const pct = (v: number) => `${clamp01(v / totalRate) * 100}%`;

            const prefix = rate.source === 'delta' ? '' : 'Avg ';

            const casualtyIconStyle = `${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'width:1.5rem;height:1.5rem;opacity:0.5;' : isPortrait && zoom < portraitZoomThreshold ? 'width:0.25rem;height:0.25rem;' : 'width:0.75rem;height:0.75rem;'}`;
            const casualtyCountStyle = `font-weight:normal;font-size:0.75rem;${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'font-size:21px;text-shadow:none;' : ''} ${isPortrait && zoom < portraitZoomThreshold ? 'font-size:0.5rem' : ''}`;
            const casualtyRateStyle = `margin-right:0.1rem;font-weight:normal;${zoom >= MAJOR_LABEL_MIN_ZOOM ? '' : (isPortrait && zoom < portraitZoomThreshold ? 'font-size:0.5rem;font-weight:semi-bold' : '')}`;

            const casualtyBadge = `padding:0.2rem;0.1rem 0.4rem;border-radius:0.75rem;display:flex;align-items:center;`;
            let totalCasualtyRateStyle = casualtyBadge;
            if (zoom < MAJOR_LABEL_MIN_ZOOM) {
              if (totalRate > 200 && totalRate <= 800) {          // Low
                totalCasualtyRateStyle += `background-color:oklch(0.7186 0.1496 91.605 / 40%);`;
              } else if (totalRate > 800 && totalRate <= 1500) {  // Medium
                totalCasualtyRateStyle += `background-color:oklch(75% 0.183 55.934 / 40%);`;
              } else if (totalRate > 1500 && totalRate <= 2500) {                      // High
                totalCasualtyRateStyle += `background-color:oklch(57.7% 0.245 27.325 / 40%);`;
              } else if (totalRate > 2500) {                      // Extreme
                totalCasualtyRateStyle += `background-color:oklch(0 0 304.24 / 40%);`;
              }
            }

            const SHOW_CASUALTY_RATE_FACTION_BAR = false;
            const SHOW_CASUALTY_RATE_FACTION_NUMBERS = true;

            casualtyLabelHtml = 
            `<div class="flex flex-col items-center text-left font-semibold text-base gap-0.5 ${totalRate == 0 ? "opacity-0" : totalRate < 50 ? "opacity-50" : ""}">
              <div class="flex items-center" style="${totalCasualtyRateStyle}">
                <div class="flex items-center">
                  <span><img src="${new URL(`../images/casualties.png`, import.meta.url).href}" style="${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'width:1.5rem;height:1.5rem;opacity:0.5;' : 'width:1rem;height:1rem;'} ${isPortrait && zoom < portraitZoomThreshold ? 'width:0.5rem;height:0.5rem;' : ''}" /></span>
                  <span style="${casualtyRateStyle} margin-left:0.2rem;margin-right:0.1rem">${totalRate}</span>
                  <span style="${casualtyCountStyle}">/hr</span>
                </div>
              </div>`;

              if ((isPortrait && zoom > portraitZoomThreshold) || (!isPortrait)) {
                if (SHOW_CASUALTY_RATE_FACTION_BAR) {
                  casualtyLabelHtml += `
                    <div class="flex items-center gap-1">
                      <img src="${Colonials?.icon}" alt="Colonial" style="${casualtyIconStyle}" />
                      <div class="flex-grow w-12 relative h-2 overflow-hidden rounded" style="box-shadow: 0 0 2px #000000A0">
                        <div class="flex h-full w-full justify-between">
                          <div class="h-full flex justify-start items-center pl-1" style="width:${pct(colonialRate)};background-color: ${Colonials?.colors.saturated};"></div>
                          <div class="h-full w-[2px]"></div>
                          <div class="h-full flex flex-row-reverse justify-start pr-1 items-center" style="width:${pct(wardenRate)}; background-color:${tinycolor(Wardens?.colors.saturated).lighten(5).saturate(10).toString()};"></div>
                        </div>
                      </div>
                      <img src="${Wardens?.icon}" alt="Warden" style="${casualtyIconStyle}" />
                    </div>`;
                }
                if (SHOW_CASUALTY_RATE_FACTION_NUMBERS) {
                  casualtyLabelHtml += `
                    <div class="flex items-center text-left font-semibold text-xs gap-1.5 ${totalRate < 200 ? "opacity-50" : ""}">
                      <div style="display:flex;align-items:center;">
                        <img src="${Colonials?.icon}" alt="Colonial" class="mr-1" style="${casualtyIconStyle}" />
                        <span style="${casualtyRateStyle}">${colonialRate}</span>
                      </div>

                      <div style="display:flex;align-items:center">
                        <span style="${casualtyRateStyle}">${wardenRate}</span>
                        <img src="${Wardens?.icon}" alt="Warden" class="ml-1" style="${casualtyIconStyle}" />
                      </div>
                    </div>`;
                }
              }
            casualtyLabelHtml += `</div>`;
          }
        }
        const icon = L.divIcon({
          className: `${nameLabelClassName}`,
          html: `<div style="display:inline-block;">${labelsVisible ? nameLabelHtml : ''}${casualtyLabelHtml}</div>`,
          iconSize: [east - west, 30]
        });

        return (
          <Marker
            key={`hex-center-${hex.apiName}`}
            position={[centerLat+70, centerLng]}
            icon={icon}
            interactive={false}
            pane="hex-info-pane"
          />
        );
      })}
    </LayerGroup>
  );
}