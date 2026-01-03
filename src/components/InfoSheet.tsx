import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { getIconLabel, getIconWikiUrl } from '../lib/icons';
import { getTeamIcon } from '../data/teams';

export default function InfoSheet() {
  const selected = useMapStore((s) => s.selectedLocation);

  if (!selected) {
    return <div className="text-sm text-gray-400">Tap a location to see details.</div>;
  }

  const { tile, nearbyMajor, hexName } = selected;
  const wikiUrl = getIconWikiUrl(tile.iconType);
  const ownerIcon = tile.owner !== 'Neutral' ? getTeamIcon(tile.owner) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {ownerIcon && <img src={ownerIcon} alt={tile.owner} className="w-6 h-6" />}
        {wikiUrl ? (
          <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-dotted">
            {getIconLabel(tile.iconType)}
          </a>
        ) : (
          <span className="font-semibold">{getIconLabel(tile.iconType)}</span>
        )}
      </div>

      <div className="text-sm text-gray-300 space-y-1">
        {nearbyMajor && <div className="font-semibold">{nearbyMajor}</div>}
        {hexName && <div className="text-gray-400">{hexName}</div>}
        {tile.owner !== 'Neutral' && (
          <div className="flex items-center gap-1">
            {ownerIcon && <img src={ownerIcon} alt={tile.owner} className="w-4 h-4" />}
            <span>{tile.owner}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(tile.flags & 0x01) !== 0 && <Badge text="Victory Base" className="bg-amber-500/20 text-amber-300" />}
        {(tile.flags & 0x10) !== 0 && <Badge text="Scorched" className="bg-red-500/20 text-red-300" />}
        {(tile.flags & 0x04) !== 0 && <Badge text="Build Site" className="bg-blue-500/20 text-blue-300" />}
      </div>
    </div>
  );
}

function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full font-semibold ${className ?? ''}`}>
      {text}
    </span>
  );
}

