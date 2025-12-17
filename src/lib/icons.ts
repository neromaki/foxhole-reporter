// Map WarAPI iconType to icon image URLs (PNG converted from TGA)
// Uses sprite atlas for efficient loading
import { mapIcons, MapIconTag } from '../data/map-icons';
import { DEBUG_MODE, ICON_SIZE } from './appConfig';
import { ICON_SPRITE_PATH, ICON_SPRITE_METADATA, getIconSpritePosition, hasIconInSprite } from '../data/icon-sprite';

// Returns sprite path and background position for use with CSS
export function getIconSprite(iconType: number, owner?: string): { spritePath: string; position: string; size: number } | null {
  const name = iconTypeToFilename(iconType, owner);
  const iconName = name.replace('.png', '');
  
  if (!hasIconInSprite(iconName)) {
    DEBUG_MODE ?? console.warn(`Icon not in sprite: ${iconName}`);
    return null;
  }
  
  return {
    spritePath: ICON_SPRITE_PATH,
    position: getIconSpritePosition(iconName),
    size: ICON_SIZE
  };
}

export function getIconSpriteFromFilename(filename: string): { spritePath: string; position: string; size: number } | null {
  const iconName = filename.replace('.png', '');

  if (!hasIconInSprite(iconName)) {
    return null;
  }
  
  return {
    spritePath: ICON_SPRITE_PATH,
    position: getIconSpritePosition(iconName),
    size: ICON_SIZE
  };
}

// Legacy function for backward compatibility - returns individual icon URL
// This will be used as fallback if sprite lookup fails
export function getIconUrl(iconType: number, owner?: string): string {
  DEBUG_MODE ?? console.log(`Getting icon URL for iconType: ${iconType}, owner: ${owner}`);
  const name = iconTypeToFilename(iconType, owner);
  return new URL(`../map/icons/${name}`, import.meta.url).href;
}

export function iconTypeToFilename(iconType: number, owner?: string): string {
  const mapIcon = getMapIcon(iconType);
  const suffix = ownerSuffix(owner);
  const base = "MapIcon" + (mapIcon?.iconFileName ?? 'Unknown');
  const filename = base + (suffix ? suffix : '') + ".png";
  DEBUG_MODE ?? console.log(`Mapped iconType ${iconType} to filename: ${filename}`);
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
  DEBUG_MODE ?? console.log(`Getting map icons with tag: ${tag}`);
  const taggedMapIcons = mapIcons.filter(icon => icon.tags.includes(tag));
  DEBUG_MODE ?? console.log(`Found ${taggedMapIcons.length} icons with tag: ${tag}`);
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

export function getIconSize(iconType?: number): [number, number] {
  // All icons are standardized to ICON_SIZE in the sprite atlas
  // Adjust specific icons if needed for special cases
  return [ICON_SIZE, ICON_SIZE];
}
