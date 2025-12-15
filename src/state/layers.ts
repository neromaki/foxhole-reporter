import { MapIconTag, MapTagHierarchy } from '../data/map-icons';

export type LayerKey = string; // dynamic hierarchical keys (structures/resources and leaves)
export type LayerState = Record<LayerKey, boolean>;
export type LayerVisualState = 'on' | 'off' | 'partial';

export interface LayerNode {
  id: LayerKey;
  label: string;
  tags: MapIconTag[];
  children?: LayerNode[];
  kind: 'structures' | 'resources';
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function titleFromTag(tag: MapIconTag): string {
  return tag.replace(/_/g, ' ');
}

function buildLeaf(path: string[], tag: MapIconTag, kind: 'structures' | 'resources'): LayerNode {
  return {
    id: `${path.join('.')}.${tag}`,
    label: titleFromTag(tag),
    tags: [tag],
    kind,
  };
}

function buildFlatCategory(path: string[], label: string, tags: MapIconTag[], kind: 'structures' | 'resources'): LayerNode {
  return {
    id: path.join('.'),
    label,
    tags,
    kind,
    children: tags.map(t => buildLeaf([...path, labelToKey(label)], t, kind)),
  };
}

function labelToKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

// Build Structures tree with per-tag leaves
function buildStructuresTree(): LayerNode {
  const basesTags = MapTagHierarchy.Bases;
  const logisticsGroups = MapTagHierarchy.Logistics as unknown as Array<Record<string, MapIconTag[]>>;
  const emplacementsGroups = MapTagHierarchy.Emplacements as unknown as Array<Record<string, MapIconTag[]>>;
  const utilityTags = MapTagHierarchy.Utility;

  const logisticsNode: LayerNode = {
    id: 'structures.logistics',
    label: 'Logistics',
    kind: 'structures',
    tags: uniq(logisticsGroups.flatMap(g => Object.values(g).flat())),
    children: logisticsGroups.map(group => {
      const [name, tags] = Object.entries(group)[0];
      return {
        id: `structures.logistics.${labelToKey(name)}`,
        label: name,
        kind: 'structures',
        tags,
        children: tags.map(t => buildLeaf(['structures', 'logistics', labelToKey(name)], t, 'structures')),
      };
    }),
  };

  const emplacementsNode: LayerNode = {
    id: 'structures.emplacements',
    label: 'Emplacements',
    kind: 'structures',
    tags: uniq(emplacementsGroups.flatMap(g => Object.values(g).flat())),
    children: emplacementsGroups.map(group => {
      const [name, tags] = Object.entries(group)[0];
      return {
        id: `structures.emplacements.${labelToKey(name)}`,
        label: name,
        kind: 'structures',
        tags,
        children: tags.map(t => buildLeaf(['structures', 'emplacements', labelToKey(name)], t, 'structures')),
      };
    }),
  };

  const basesNode: LayerNode = {
    id: 'structures.bases',
    label: 'Bases',
    kind: 'structures',
    tags: basesTags,
    children: basesTags.map(t => buildLeaf(['structures', 'bases'], t, 'structures')),
  };

  const utilityNode: LayerNode = {
    id: 'structures.utility',
    label: 'Utility',
    kind: 'structures',
    tags: utilityTags,
    children: utilityTags.map(t => buildLeaf(['structures', 'utility'], t, 'structures')),
  };

  return {
    id: 'structures',
    label: 'Structures',
    kind: 'structures',
    tags: uniq([
      ...basesTags,
      ...logisticsNode.tags,
      ...emplacementsNode.tags,
      ...utilityTags,
    ]),
    children: [basesNode, logisticsNode, emplacementsNode, utilityNode],
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
    const selfOn = !!activeLayers[k];
    const children = getChildren(k);
    if (children.length === 0) {
      const leafState: LayerVisualState = selfOn ? 'on' : 'off';
      memo.set(k, leafState);
      return leafState;
    }
    if (!selfOn) {
      memo.set(k, 'off');
      return 'off';
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
    territories: true,
    majorLocations: true,
    minorLocations: true,
  } as LayerState;

  // Structures default on
  getDescendants('structures').concat(['structures']).forEach(k => {
    state[k] = true;
  });

  // Resources default off at parent, children on (so re-enabling restores on)
  state['resources'] = false;
  getDescendants('resources').forEach(k => {
    state[k] = true;
  });

  return state;
}
