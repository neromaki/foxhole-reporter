// Map WarAPI iconType to icon image URLs (PNG converted from TGA)
// Uses Vite's import.meta.url to resolve asset paths at build time
import { mapIcons, MapIconTag } from '../data/map-icons';

export function getIconUrl(iconType: number, owner?: string): string {
  console.log(`Getting icon URL for iconType: ${iconType}, owner: ${owner}`);
  const name = iconTypeToFilename(iconType, owner);
  return new URL(`../map/icons/${name}`, import.meta.url).href;
}

export function iconTypeToFilename(iconType: number, owner?: string): string {
  const mapIcon = getMapIcon(iconType);
  const suffix = ownerSuffix(owner);
  const base = "MapIcon" + (mapIcon?.iconFileName ?? 'Unknown');
  const filename = base + (suffix ? suffix : '') + ".png";
  console.log(`Mapped iconType ${iconType} to filename: ${filename}`);
  return filename;
}

export function getIconLabel(iconType: number): string {
  const mapIcon = getMapIcon(iconType);
  return mapIcon?.displayName ?? `Icon ${iconType}`;
}

function ownerSuffix(owner?: string): string | '' {
  if (!owner) return '';
  const normalized = String(owner).trim().toUpperCase();
  if (normalized === 'COLONIAL') return 'Colonial';
  if (normalized === 'WARDEN') return 'Warden';
  if (normalized === 'NONE' || normalized === 'NEUTRAL') return '';
  // If an unexpected value comes through, do not append
  return '';
}

export function getMapIcon(iconType: number) {
    return mapIcons.find(icon => icon.id === iconType);
}

export function getMapIconsByTag(tag: MapIconTag) {
  console.log(`Getting map icons with tag: ${tag}`);
  const taggedMapIcons = mapIcons.filter(icon => icon.tags.includes(tag));
  console.log(`Found ${taggedMapIcons.length} icons with tag: ${tag}`);
  return taggedMapIcons;
}

// Build a wiki URL for an icon type. If a specific wikiPage is provided in data, use it.
// Otherwise, fall back to heuristics based on displayName.
export function getIconWikiUrl(iconType: number): string | null {
  const mi = getMapIcon(iconType);
  if (!mi) return null;
  const base = 'https://foxhole.wiki.gg/wiki/';
  const slug = mi.wikiPage
    ? mi.wikiPage
    : heuristicWikiSlug(mi.displayName);
  return slug ? base + slug : null;
}

function heuristicWikiSlug(name: string): string {
  // Prefer underscores for spaces, strip apostrophes and commas
  const cleaned = name
    .replace(/['’,]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  return cleaned;
}

export function getIconSize(iconType: number): [number, number] {
  // Provide reasonable default sizing; adjust specific icons if needed
  switch (iconType) {
    case 56:
    case 57:
    case 58:
      return [24, 24];
    case 37:
    case 59:
      return [24, 24];
    default:
      return [24, 24];
  }
}
