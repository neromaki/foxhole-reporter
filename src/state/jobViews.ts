import { MapIconTag } from '../data/map-icons';

export type JobViewMatchMode = 'ALL' | 'ANY';

export interface JobViewSpec {
  id: string;
  name: string;
  tags: MapIconTag[]; // tags required (ALL) or considered (ANY)
  mode: JobViewMatchMode;
}

export interface JobViewGroup {
  id: string; // parent id selectable
  name: string;
  children: JobViewSpec[];
}

export const jobViewGroups: JobViewGroup[] = [
  {
    id: 'resource-mining',
    name: 'Resource Mining',
    children: [
      { id: 'salvage-miner', name: 'Salvage Miner', tags: [MapIconTag.Resource_Salvage, MapIconTag.Refinery], mode: 'ANY' },
      { id: 'component-miner', name: 'Component Miner', tags: [MapIconTag.Resource_Component, MapIconTag.Refinery], mode: 'ANY' },
      { id: 'sulfur-miner', name: 'Sulfur Miner', tags: [MapIconTag.Resource_Sulfur, MapIconTag.Refinery], mode: 'ANY' }, // NOTE: uses Resource_Component per spec provided
      { id: 'oil-miner', name: 'Oil Miner', tags: [MapIconTag.Resource_Oil], mode: 'ALL' },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    children: [
      { id: 'logi-frontline', name: 'Logistics (Frontline)', tags: [MapIconTag.Storage], mode: 'ALL' },
      { id: 'logi-midline', name: 'Logistics (Midline)', tags: [MapIconTag.Logistics], mode: 'ALL' },
      { id: 'logi-backline', name: 'Logistics (Backline)', tags: [MapIconTag.Logistics, MapIconTag.Production], mode: 'ANY' },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    children: [
      { id: 'factory', name: 'Factory', tags: [MapIconTag.Production], mode: 'ALL' },
      { id: 'vehicles', name: 'Vehicles', tags: [MapIconTag.Vehicle_Factory], mode: 'ALL' },
      { id: 'naval', name: 'Naval', tags: [MapIconTag.Shipyard], mode: 'ALL' },
      { id: 'yard', name: 'Yard', tags: [MapIconTag.Construction_Yard], mode: 'ALL' },
    ],
  },
];

// Flatten for lookup
const childIndex: Record<string, JobViewSpec> = {};
for (const group of jobViewGroups) {
  for (const child of group.children) childIndex[child.id] = child;
}

export function isGroup(viewId: string): boolean {
  return jobViewGroups.some(g => g.id === viewId);
}

export function getGroup(viewId: string) {
  return jobViewGroups.find(g => g.id === viewId);
}

export function getJobViewFilter(viewId: string): ((iconTags: MapIconTag[]) => boolean) | null {
  if (isGroup(viewId)) {
    const group = getGroup(viewId);
    if (!group) return null;
    const childFilters = group.children.map(c => getJobViewFilter(c.id)).filter(Boolean) as ((iconTags: MapIconTag[]) => boolean)[];
    return (iconTags: MapIconTag[]) => childFilters.some(fn => fn(iconTags));
  }
  const spec = childIndex[viewId];
  if (!spec) return null;
  if (spec.mode === 'ALL') {
    return (iconTags: MapIconTag[]) => spec.tags.every(t => iconTags.includes(t));
  } else {
    return (iconTags: MapIconTag[]) => spec.tags.some(t => iconTags.includes(t));
  }
}

export function listAllViewIds(): string[] {
  return [
    ...jobViewGroups.map(g => g.id),
    ...Object.keys(childIndex)
  ];
}
