import React, { useMemo } from 'react';
import { useMapStore } from '../state/useMapStore';
import {
  LayerKey,
  LayerVisualState,
  computeVisualState,
  structuresRoot,
  resourcesRoot,
  LayerNode,
} from '../state/layers';
import { getIconSprite, iconTypeToFilename, getMapIcon, getIconSize, getIconUrl } from '../lib/icons';
import { ICON_SPRITE_PATH, SPRITE_WIDTH, SPRITE_HEIGHT, SPRITE_ICON_SIZE, ICON_SPRITE_METADATA } from '../data/icon-sprite';
import { MapIcon, MapIconTag, getMapTag } from '../data/map-icons';
import { useLatestSnapshot } from '../lib/queries';
import { useWarApiDirect } from '../lib/hooks/useWarApiDirect';
import { DATA_SOURCE } from '../lib/mapConfig';
import { Tile } from './Tile';

type NonTreeLayerKey = 'territories' | 'majorLocations' | 'casualties';

const otherLabels: Record<NonTreeLayerKey, string> = {
  territories: 'Territories',
  casualties: 'Casualties',
  majorLocations: 'Labels',
};

function indicatorClass(state: LayerVisualState) {
  if (state === 'on') return 'bg-green-400';
  if (state === 'partial') return 'bg-yellow-400';
  return 'bg-gray-600';
}

function TreeToggle({ node, depth, countsByIconType }: { node: LayerNode; depth: number; countsByIconType: Map<number, { colonial: number, warden: number, neutral: number }> }) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);

  const state = useMemo(() => computeVisualState(activeLayers, node.id), [activeLayers, node.id]);
  const disabled = false;
  const icon = node.leaf && node.tags.length > 0 ? getTagIcon(node.tags[0]) : null;
  const count = node.leaf && node.tags.length > 0 ? getCountForTag(node.tags[0], countsByIconType) : {};

  return (
    <li className={`space-y-1 depth-${depth} ${depth == 1 && !node.leaf ? 'mt-3' : ''} ${node.leaf ? 'isLeaf' : ''}`}>
      { node.leaf ? (
        <div className={`mt-3`}>
          <Tile k={node.id} active={activeLayers[node.id]} callBack={() => toggle(node.id)} icon={icon} label={node.label} counts={count} />
        </div>
      ) : (
      <button
        onClick={() => {
          if (disabled) return;
          toggle(node.id);
        }}
        disabled={disabled}
        className={`relative w-full flex items-center justify-start px-3 py-2 rounded text-sm border transition ${depth > 0 ? activeLayers[node.id] ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500' : 'bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700' : 'bg-none border-none'}`}
      >
        <div className={`flex justify-between items-center w-full`}>
          <span>{node.label}</span>
          <span className={`h-3 w-3 rounded-full inline-block ${indicatorClass(state)}`}></span>
        </div>
      </button>
      )}
      {node.children && node.children.length > 0 && (
        <ul className={`inner-ul depth-${depth + 1} ${node.children && node.children.length > 0 && node.children[0].leaf ? 'flex justify-start flex-wrap gap-3 bg-gray-950 ml-0 !mt-0 px-2 pt-2 pb-4 rounded-b' : ''}`}>
          {node.children.map((child: any) => (
            <TreeToggle key={child.id} node={child} depth={depth + 1} countsByIconType={countsByIconType} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LayerTogglePanel() {
  const active = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);
  const setAllLayers = useMapStore((s) => s.setAllLayers);

  // Get current snapshot based on configured data source
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;

  // Pre-compute counts by iconType for the current snapshot
  const countsByIconType = useMemo(() => {
    const m = new Map<number, { colonial: number; warden: number; neutral: number }>();
    const items = (snapshot as any)?.territories as Array<{ iconType: number; teamId?: string }> | undefined;
    if (!items) return m;
    for (const t of items) {
      const current = m.get(t.iconType) ?? { colonial: 0, warden: 0, neutral: 0 };
      const team = t.teamId?.toLowerCase() ?? 'neutral';
      if (team === 'colonials') current.colonial++;
      else if (team === 'wardens') current.warden++;
      else current.neutral++;
      m.set(t.iconType, current);
    }
    return m;
  }, [snapshot]);

  return (
    <div className="space-y-4">
      <div>
        <ul className="flex justify-around align-items-start flex-wrap">
          {(Object.keys(otherLabels) as Array<keyof typeof otherLabels>).map((k) => {
            return (
              <li key={k}>
                <Tile k={k} active={active[k as LayerKey]} label={otherLabels[k]} counts={{}} callBack={() => toggle(k as LayerKey)} />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <ul className={`bg-gray-900`}>
          <TreeToggle node={structuresRoot} depth={0} countsByIconType={countsByIconType} />
        </ul>
      </div>


      <div className="space-y-2">
        <ul>
          <TreeToggle node={resourcesRoot} depth={0} countsByIconType={countsByIconType} />
        </ul>
      </div>
    </div>
  );
}

function getTagIcon(tag: MapIconTag): { type: string, url: URL, coords: { x: number, y: number }, width: number, height: number, iconType: number } | null {
  const tagData = getMapTag(tag);
  if (!tagData) return null;
  const iconType = tagData.mapIcon;
  const [bw, bh] = getIconSize(iconType);

  // Try to use sprite first, fallback to individual icon
  const sprite = getIconSprite(iconType);
  
  if (sprite) {
    // Get icon name and pre-calculate scaled values once (avoid function call overhead)
    const iconName = iconTypeToFilename(iconType).replace('.png', '');
    const coords = ICON_SPRITE_METADATA[iconName];

    // Pre-calculate scaled position inline
    const x = coords ? coords.x : 0;
    const y = coords ? coords.y : 0;
    const bgWidth = SPRITE_WIDTH;
    const bgHeight = SPRITE_HEIGHT;

    return { 
      type: 'sprite' as const, 
      url: new URL(sprite.spritePath, import.meta.url), 
      coords: { x: x, y: y },
      width: bgWidth, 
      height: bgHeight,
      iconType: iconType,
    };
  } else {
    return {
      type: 'icon' as const,
      url: new URL(getIconUrl(iconType), import.meta.url),
      coords: { x: 0, y: 0 },
      width: bw,
      height: bh,
      iconType: iconType,
    }
  }
}

function getCountForTag(tag: MapIconTag, countsByIconType: Map<number, { colonial: number, warden: number, neutral: number }>): object {
  const tagData = getMapTag(tag);
  if (!tagData) return {};
  const iconType = tagData.mapIcon as number;
  if(iconType == MapIcon.Town_Base_1) {
    // Special case: iconType 56, 57 and 58 represents different tiers of the same Town Base
    // Sum counts for all relevant iconTypes
    return [MapIcon.Town_Base_1, MapIcon.Town_Base_2, MapIcon.Town_Base_3].reduce((sum, it) => {
      const count = countsByIconType.get(it) ?? { colonial: 0, warden: 0, neutral: 0 };
      return {
        colonial: sum.colonial + count.colonial,
        warden: sum.warden + count.warden,
        neutral: sum.neutral + count.neutral,
      };
    }, { colonial: 0, warden: 0, neutral: 0 });
  }
  return countsByIconType.get(iconType) ?? { colonial: 0, warden: 0, neutral: 0 };
}
