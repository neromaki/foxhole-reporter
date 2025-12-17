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
import { MapIconTag, getMapTag } from '../data/map-icons';

type NonTreeLayerKey = 'territories' | 'majorLocations';

const otherLabels: Record<NonTreeLayerKey, string> = {
  territories: 'Territories',
  majorLocations: 'Major locations',
};

function indicatorClass(state: LayerVisualState) {
  if (state === 'on') return 'bg-green-400';
  if (state === 'partial') return 'bg-yellow-400';
  return 'bg-gray-600';
}

function TreeToggle({ node, depth }: { node: LayerNode; depth: number }) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);

  const state = useMemo(() => computeVisualState(activeLayers, node.id), [activeLayers, node.id]);
  const disabled = false;
  const icon = node.leaf && node.tags.length > 0 ? getTagIcon(node.tags[0]) : null;

  return (
    <li className={`space-y-1 depth-${depth} ${depth == 1 && !node.leaf ? 'mt-4' : ''} ${node.leaf ? 'isLeaf' : ''}`}>
      <button
        onClick={() => {
          if (disabled) return;
          toggle(node.id);
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-start px-3 py-2 rounded text-sm border transition ${activeLayers[node.id] ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500' : 'bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700'}`}
      >
        { node.leaf ? (
          icon
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
            <TreeToggle key={child.id} node={child} depth={depth + 1} />
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
          <TreeToggle node={structuresRoot} depth={0} />
        </ul>
      </div>


      <div className="space-y-2">
        <ul className="space-y-1">
          <TreeToggle node={resourcesRoot} depth={0} />
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
