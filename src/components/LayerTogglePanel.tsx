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

type NonTreeLayerKey = 'territories' | 'majorLocations' | 'casualties';

const otherLabels: Record<NonTreeLayerKey, string> = {
  territories: 'Territories',
  majorLocations: 'Major locations',
  casualties: 'Casualties',
};

function indicatorClass(state: LayerVisualState) {
  if (state === 'on') return 'bg-green-400';
  if (state === 'partial') return 'bg-yellow-400';
  return 'bg-gray-600';
}

function TreeToggle({ node, depth, countsByIconType }: { node: LayerNode; depth: number; countsByIconType: Map<number, number> }) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);

  const state = useMemo(() => computeVisualState(activeLayers, node.id), [activeLayers, node.id]);
  const disabled = false;
  const icon = node.leaf && node.tags.length > 0 ? getTagIcon(node.tags[0]) : null;
  const count = node.leaf && node.tags.length > 0 ? getCountForTag(node.tags[0], countsByIconType) : null;

  return (
    <li className={`space-y-1 depth-${depth} ${depth == 1 && !node.leaf ? 'mt-4' : ''} ${node.leaf ? 'isLeaf' : ''}`}>
      <button
        onClick={() => {
          if (disabled) return;
          toggle(node.id);
        }}
        disabled={disabled}
        className={`relative w-full flex items-center justify-start px-3 py-2 rounded text-sm border transition ${activeLayers[node.id] ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500' : 'bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700'}`}
      >
        { node.leaf ? (
          <>
            {icon}
            {typeof count === 'number' && (
              <span className="absolute top-0 right-0 rounded bg-gray-950/80 text-[10px] leading-none px-1 py-0.5">
                {count}
              </span>
            )}
          </>
        ) : (
          <div className={`flex justify-between items-center w-full`}>
            <span>{node.label}</span>
            <span className={`h-3 w-3 rounded-full inline-block ${indicatorClass(state)}`}></span>
          </div>
        )}
      </button>
      {node.children && node.children.length > 0 && (
        <ul className={`inner-ul ml-3 depth-${depth + 1} ${node.children && node.children.length > 0 && node.children[0].leaf ? 'flex flex-wrap gap-1 bg-gray-950 ml-0 !mt-0 p-2 rounded-b' : ''}`}>
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
    const m = new Map<number, number>();
    const items = (snapshot as any)?.territories as Array<{ iconType: number }> | undefined;
    if (!items) return m;
    for (const t of items) {
      const c = m.get(t.iconType) ?? 0;
      m.set(t.iconType, c + 1);
    }
    return m;
  }, [snapshot]);

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Layers</h2>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
            onClick={() => setAllLayers(true)}
          >Show all</button>
          <button
            className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
            onClick={() => setAllLayers(false)}
          >Hide all</button>
        </div>
      </div>

      <div className="space-y-2">
        <ul>
          <TreeToggle node={structuresRoot} depth={0} countsByIconType={countsByIconType} />
        </ul>
      </div>


      <div className="space-y-2">
        <ul className="space-y-1">
          <TreeToggle node={resourcesRoot} depth={0} countsByIconType={countsByIconType} />
        </ul>
      </div>

      <ul className="space-y-2">
        {(Object.keys(otherLabels) as Array<keyof typeof otherLabels>).map((k) => {
          return (
            <li key={k}>
              <button
                onClick={() => {
                  toggle(k as LayerKey);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm border transition ${active[k as LayerKey] ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
              >
                <span>{otherLabels[k]}</span>
                <span className={`h-3 w-3 rounded-full ${active[k as LayerKey] ? 'bg-green-400' : 'bg-gray-600'}`}></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getTagIcon(tag: MapIconTag)  {
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

    return (
        <div style={{ width: bw, height: bw, backgroundImage: `url(${sprite.spritePath})`, backgroundPosition: `-${x}px -${y}px`, backgroundSize: `${bgWidth}px ${bgHeight}px`, backgroundRepeat: 'no-repeat' }}></div>
    );
  } else {
    return (
      <img src={getIconUrl(iconType)} style={{ width: bw, height: bh }} alt={`Icon ${iconType}`} />
    )
  }
}

function getCountForTag(tag: MapIconTag, countsByIconType: Map<number, number>): number {
  const tagData = getMapTag(tag);
  if (!tagData) return 0;
  const iconType = tagData.mapIcon as number;
  if(iconType == MapIcon.Town_Base_1) {
    // Special case: iconType 56, 57 and 58 represents different tiers of the same Town Base
    // Sum counts for all relevant iconTypes
    return [MapIcon.Town_Base_1, MapIcon.Town_Base_2, MapIcon.Town_Base_3].reduce((sum, it) => sum + (countsByIconType.get(it) ?? 0), 0);
  }
  return countsByIconType.get(iconType) ?? 0;
}
