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

export default function HexInfo({
  casualtyRates,
  casualtiesVisible,
}: {
  casualtyRates: ReturnType<typeof useCasualtyRates>;
  casualtiesVisible: boolean;
}) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  const disabledHexes = useMapStore((s) => s.disabledHexes);
  const reportModeActive = useMapStore((s) => s.activeReportMode !== null);
  const reportMode = useMapStore((s) => s.activeReportMode);

  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  const Colonials = getTeamData('Colonial');
  const Wardens = getTeamData('Warden');

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
        let casualtyLabelHtml = '';
        if (casualtiesVisible && !reportModeActive && zoom <= CASUALTIES_MAX_ZOOM) {
          const rate = casualtyRates.getRate(hex.apiName);
          if (rate) {
            const wardenRate = Math.round(rate.warden);
            const colonialRate = Math.round(rate.colonial);
            const totalRate = wardenRate + colonialRate;
            const prefix = rate.source === 'delta' ? '' : 'Avg ';

            const casualtyIconStyle = `margin-right:0.25rem;${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'width:1.5rem;height:1.5rem;opacity:0.5;' : 'width:0.75rem;height:0.75rem;'}`;
            const casualtyCountStyle = `font-weight:normal;font-size:0.75rem;${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'font-size:21px;text-shadow:none;' : ''}`;
            const casualtyRateStyle = `margin-right:0.1rem;font-weight:normal;${zoom >= MAJOR_LABEL_MIN_ZOOM ? 'font-size:26px;text-shadow:none;font-weight:bold;' : ''}`;

            const casualtyBadge = `padding:0.1rem 0.4rem;border-radius:2rem;display:flex;align-items:center;`;
            let totalCasualtyRateStyle = casualtyBadge;
            if (zoom < MAJOR_LABEL_MIN_ZOOM) {
              if (totalRate > 200 && totalRate <= 500) {
                totalCasualtyRateStyle += `background-color:oklch(0.879 0.169 91.605 / 40%);`;
              } else if (totalRate > 500 && totalRate <= 1000) {
                totalCasualtyRateStyle += `background-color:oklch(75% 0.183 55.934 / 40%);`;
              } else if (totalRate > 1000) {
                totalCasualtyRateStyle += `background-color:oklch(57.7% 0.245 27.325 / 40%);`;
              }
            }

            casualtyLabelHtml = `
              <div style="display:flex;flex-direction:column;align-items:center;text-align:left;font-weight:semi-bold;font-size:1rem;${totalRate == 0 ? 'opacity:0;' : totalRate < 50 ? 'opacity:0.5;color:oklch(86.9% 0.022 252.894);' : ''}">
                <div style="display:flex;align-items:center">
                  
                  <div style="${totalCasualtyRateStyle}">
                    <span><img src="${new URL(`../images/casualties.png`, import.meta.url).href}" style="width:1rem;height:1rem;" /></span>
                    <span style="${casualtyRateStyle} margin-left:0.2rem;margin-right:0.1rem">${totalRate}</span>
                    <span style="${casualtyCountStyle}">/hr</span>
                  </div>
                </div>

                <div style="display:flex;flex-direction:row;align-items:center;text-align:left;font-weight:semi-bold;font-size:0.75rem">
                  <div style="display:flex;align-items:center;margin-right:0.5rem">
                    <img src="${Colonials?.icon}" alt="Colonial" style="${casualtyIconStyle}" />
                    <div>
                      <span style="${casualtyRateStyle}">${colonialRate}</span>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center">
                    <img src="${Wardens?.icon}" alt="Warden" style="${casualtyIconStyle}" />
                    <div>
                      <span style="${casualtyRateStyle}">${wardenRate}</span>
                    </div>
                  </div>
                </div>
              </div>`;
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