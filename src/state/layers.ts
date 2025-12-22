import { MapIconTag, MapTagHierarchy, getMapTag } from '../data/map-icons';

export type LayerKey = string; // dynamic hierarchical keys (structures/resources and leaves)
export type LayerState = Record<LayerKey, boolean>;
export type LayerVisualState = 'on' | 'off' | 'partial';

export interface LayerNode {
  id: LayerKey;
  label: string;
  tags: MapIconTag[];
  children?: LayerNode[];
  kind: 'structures' | 'resources';
  leaf?: boolean;
  icon?: string;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function titleFromTag(tag: MapIconTag): string {
    const tagInfo = getMapTag(tag);
    if (tagInfo && tagInfo.displayName) return tagInfo.displayName;
    return tag.replace(/_/g, ' ');
}

function buildLeaf(path: string[], tag: MapIconTag, kind: 'structures' | 'resources'): LayerNode {
  return {
    id: `${path.join('.')}.${tag}`,
    label: titleFromTag(tag),
    tags: [tag],
    kind,
    leaf: true,
  };
}

function labelToKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

// Build Structures tree with per-tag leaves
function buildStructuresTree(): LayerNode {
  const groups: Array<{ key: string; label: string; tags: MapIconTag[] }> = [
    { key: 'bases', label: 'Bases', tags: MapTagHierarchy.Bases },
    { key: 'storage', label: 'Storage', tags: MapTagHierarchy.Storage },
    { key: 'production', label: 'Production', tags: MapTagHierarchy.Production },
    { key: 'construction', label: 'Construction', tags: MapTagHierarchy.Construction },
    { key: 'defensive', label: 'Defensive', tags: MapTagHierarchy.Defensive },
    { key: 'utility', label: 'Utility', tags: MapTagHierarchy.Utility },
    { key: 'rocket', label: 'Rocket', tags: MapTagHierarchy.Rocket },
  ];

  const children = groups.map(({ key, label, tags }) => ({
    id: `structures.${key}`,
    label,
    tags,
    kind: 'structures' as const,
    children: tags.map((t) => buildLeaf(['structures', key], t, 'structures')),
  }));

  return {
    id: 'structures',
    label: 'Structures',
    kind: 'structures',
    tags: uniq(children.flatMap((c) => c.tags)),
    children,
  };
}

// Build Resources tree with per-tag leaves
function buildResourcesTree(): LayerNode {
  const resourceTags = MapTagHierarchy.Resources;
  return {
    id: 'resources',
    label: 'Resources',
    kind: 'resources',
    tags: resourceTags,
    children: resourceTags.map(t => buildLeaf(['resources'], t, 'resources')),
  };
}

export const structuresRoot = buildStructuresTree();
export const resourcesRoot = buildResourcesTree();

export const layerTrees: LayerNode[] = [structuresRoot, resourcesRoot];

// Flatten helpers
const childrenByKey = new Map<LayerKey, LayerKey[]>();
const parentByKey = new Map<LayerKey, LayerKey | null>();
const tagsByKey = new Map<LayerKey, MapIconTag[]>();

function walk(node: LayerNode, parent: LayerKey | null) {
  parentByKey.set(node.id, parent);
  tagsByKey.set(node.id, node.tags);
  if (node.children && node.children.length > 0) {
    const ids = node.children.map(c => c.id);
    childrenByKey.set(node.id, ids);
    node.children.forEach(child => walk(child, node.id));
  } else {
    childrenByKey.set(node.id, []);
  }
}

layerTrees.forEach(tree => walk(tree, null));

export function getChildren(key: LayerKey): LayerKey[] {
  return childrenByKey.get(key) ?? [];
}

export function getDescendants(key: LayerKey): LayerKey[] {
  const out: LayerKey[] = [];
  const stack = [...(childrenByKey.get(key) ?? [])];
  while (stack.length) {
    const current = stack.pop() as LayerKey;
    out.push(current);
    stack.push(...(childrenByKey.get(current) ?? []));
  }
  return out;
}

export function getAncestors(key: LayerKey): LayerKey[] {
  const res: LayerKey[] = [];
  let cur: LayerKey | null | undefined = parentByKey.get(key);
  while (cur) {
    res.push(cur);
    cur = parentByKey.get(cur);
  }
  return res;
}

export function computeVisualState(activeLayers: LayerState, key: LayerKey): LayerVisualState {
  const memo = new Map<LayerKey, LayerVisualState>();

  const compute = (k: LayerKey): LayerVisualState => {
    if (memo.has(k)) return memo.get(k)!;
    const children = getChildren(k);
    if (children.length === 0) {
      const leafState: LayerVisualState = activeLayers[k] ? 'on' : 'off';
      memo.set(k, leafState);
      return leafState;
    }
    const childStates = children.map(compute);
    const allOn = childStates.every((s) => s === 'on');
    const allOff = childStates.every((s) => s === 'off');
    const state: LayerVisualState = allOn ? 'on' : allOff ? 'off' : 'partial';
    memo.set(k, state);
    return state;
  };

  return compute(key);
}

export const layerTagsByKey: Record<LayerKey, MapIconTag[]> = {};
tagsByKey.forEach((v, k) => {
  layerTagsByKey[k] = v;
});

export const allLayerKeys: LayerKey[] = Array.from(tagsByKey.keys());

export function isStructureLayerKey(key: LayerKey): boolean {
  return key.startsWith('structures');
}

export function isResourceLayerKey(key: LayerKey): boolean {
  return key.startsWith('resources');
}

export function getDefaultLayerState(): LayerState {
  const state: LayerState = {
    structures: true,
    territories: true,
    majorLocations: true,
    casualties: true,
  } as LayerState;

  // Structures default on
  getDescendants('structures').concat(['structures']).forEach(k => {
    state[k] = false;
  });

  state['structures'] = true;
  state['structures.bases'] = true;
  state['structures.bases.Base_Town'] = true;
  state['structures.bases.Base_Relic'] = true;

  // Resources default off (parent and children)
  state['resources'] = false;
  getDescendants('resources').forEach(k => {
    state[k] = false;
  });

  return state;
}
