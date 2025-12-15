import React, { useMemo } from 'react';
import { useMapStore } from '../state/useMapStore';
import {
  LayerKey,
  LayerVisualState,
  computeVisualState,
  structuresRoot,
  resourcesRoot,
  getAncestors,
  LayerNode,
} from '../state/layers';

type NonTreeLayerKey = 'territories' | 'majorLocations' | 'minorLocations';

const otherLabels: Record<NonTreeLayerKey, string> = {
  territories: 'Territories',
  majorLocations: 'Major locations',
  minorLocations: 'Minor locations',
};

function indicatorClass(state: LayerVisualState) {
  if (state === 'on') return 'bg-green-400';
  if (state === 'partial') return 'bg-yellow-400';
  return 'bg-gray-600';
}

function TreeToggle({ node, depth }: { node: LayerNode; depth: number }) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);
  const activeJobViewId = useMapStore((s) => s.activeJobViewId);

  const state = useMemo(() => computeVisualState(activeLayers, node.id), [activeLayers, node.id]);
  const lockedByJobView = !!activeJobViewId && node.kind === 'structures';
  const ancestorOff = useMemo(() => getAncestors(node.id).some(a => activeLayers[a] === false), [activeLayers, node.id]);
  const disabled = lockedByJobView || ancestorOff;

  return (
    <li className={`space-y-1 outer-li depth-${depth}`}>
      <button
        onClick={() => {
          if (disabled) return;
          toggle(node.id);
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-start px-3 py-2 rounded text-sm border transition ${activeLayers[node.id] ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`h-3 w-3 rounded-full mr-2 ${indicatorClass(state)}`}></span>
        <span>{node.label}</span>
      </button>
      {node.children && node.children.length > 0 && (
        <ul className={`space-y-1 inner-ul ml-3 depth-${depth + 1}`}>
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
  const setStructureLayers = useMapStore((s) => s.setStructureLayers);
  const setResourceLayers = useMapStore((s) => s.setResourceLayers);
  const activeJobViewId = useMapStore((s) => s.activeJobViewId);

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Layers</h2>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-gray-400">Structures</span>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setStructureLayers(true)}
              disabled={!!activeJobViewId}
            >Show all</button>
            <button
              className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setStructureLayers(false)}
              disabled={!!activeJobViewId}
            >Hide all</button>
          </div>
        </div>
        <ul className="space-y-1">
          <TreeToggle node={structuresRoot} depth={0} />
        </ul>
      </div>

      <div className="h-px bg-gray-800"></div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-gray-400">Resources</span>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setResourceLayers(true)}
            >Show all</button>
            <button
              className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setResourceLayers(false)}
            >Hide all</button>
          </div>
        </div>
        <ul className="space-y-1">
          <TreeToggle node={resourcesRoot} depth={0} />
        </ul>
      </div>

      <div className="h-px bg-gray-800"></div>

      <ul className="space-y-2">
        {(Object.keys(otherLabels) as Array<keyof typeof otherLabels>).map((k) => {
          const locked = !!activeJobViewId && (k === 'minorLocations');
          const prevent = !!activeJobViewId && (k === 'majorLocations');
          return (
            <li key={k}>
              <button
                onClick={() => {
                  if (prevent) return;
                  toggle(k as LayerKey);
                }}
                disabled={locked}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm border transition ${active[k as LayerKey] ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'} ${locked || prevent ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{otherLabels[k]}</span>
                <span className={`h-3 w-3 rounded-full ${active[k as LayerKey] ? 'bg-green-400' : 'bg-gray-600'}`}></span>
              </button>
            </li>
          );
        })}
      </ul>

      {activeJobViewId && (
        <div className="mt-2 text-[10px] text-gray-400 space-y-0.5">
          <div>Job View active: structures locked; minor labels hidden.</div>
        </div>
      )}
    </div>
  );
}
