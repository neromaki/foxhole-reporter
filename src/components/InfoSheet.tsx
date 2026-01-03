import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { getIconLabel, getIconSize, getIconSprite, getIconUrl, getIconWikiUrl, iconTypeToFilename } from '../lib/icons';
import { getTeamData } from '../data/teams';
import { ICON_SPRITE_METADATA, SPRITE_HEIGHT, SPRITE_WIDTH } from '../data/icon-sprite';
import { formatTimeAgo } from '../lib/time';

export default function InfoSheet() {
  const selected = useMapStore((s) => s.selectedLocation);

  if (!selected) {
    return <div className="text-sm text-gray-400">Tap a location to see details.</div>;
  }

  const { tile, id, name, owner, history, hexName } = selected;
  const wikiUrl = getIconWikiUrl(tile.iconType);
  const iconType = tile.iconType;
  const team = tile.owner !== 'Neutral' ? getTeamData(tile.owner) : null;
  const events = history && history.events ? history.events : [];


  const [bw, bh] = getIconSize(iconType);

  // Try to use sprite first, fallback to individual icon
  const sprite = getIconSprite(iconType);
  
  // Get icon name and pre-calculate scaled values once (avoid function call overhead)
  const iconName = iconTypeToFilename(iconType).replace('.png', '');
  const coords = ICON_SPRITE_METADATA[iconName];

  // Pre-calculate scaled position inline
  const x = coords ? coords.x : 0;
  const y = coords ? coords.y : 0;
  const bgWidth = SPRITE_WIDTH;
  const bgHeight = SPRITE_HEIGHT;

  return (
    <div className="flex items-start justify-stretch space-y-3">
      
      <div className={`flex flex-col items-start flex-1 space-y-2`}>
        <div className="flex items-center gap-2">
          { sprite ? (
            <div className={`scale-[80%]`} style={{ 
                  width: bw, 
                  height: bh, 
                  backgroundImage: `url(${new URL(sprite.spritePath, import.meta.url).toString()})`, 
                  backgroundPosition: `-${x}px -${y}px`, 
                  backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                  backgroundRepeat: 'no-repeat' }}></div>
          ) : (
            <img src={new URL(getIconUrl(iconType), import.meta.url).href} className={`scale-90`} width={bw} height={bh} />
          )}
          {/* {ownerIcon && <img src={ownerIcon} alt={tile.owner} className="w-6 h-6" />} */}
          {wikiUrl ? (
            <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className={` underline decoration-dotted`}>
              {getIconLabel(tile.iconType)}
            </a>
          ) : (
            <span className={``}>{getIconLabel(tile.iconType)}</span>
          )}
        </div>

        <div className="text-sm text-gray-300 space-y-1 ml-3">
          { name && 
            <div className={`flex items-center gap-x-1`}>
              <img src={new URL('../images/icn_nested.png', import.meta.url).href} className={`w-4 h-4`} />
              <img src={new URL('../images/icn_territory.png', import.meta.url).href} className={`w-4 h-4`} />
              <span className={`font-semibold`}>{name}</span>
            </div>
          }
          { hexName && 
            <div className={`flex items-center gap-x-1 ${name && `ml-6`}`}>
              <img src={new URL('../images/icn_nested.png', import.meta.url).href} className={`w-4 h-4`} />
              <img src={new URL('../images/icn_hex.png', import.meta.url).href} className={`w-4 h-4`} />
              <span className={`text-gray-400`}>{hexName}</span>
            </div>
          }
        </div>
      </div>

      <div className={`flex flex-col items-end gap-y-2`}>
        {team && team.name !== 'Neutral' && (
          <div className="flex items-center gap-1">
            <Badge text={team.name} icon={team.icon} className={`text-xs`} style={{ backgroundColor: team.colors.saturated }} />
            { events.length > 0 && events[0] && (
              <span>{(`${formatTimeAgo(events[0].at)}`)}</span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {(tile.flags & 0x01) !== 0 && <Badge text="Victory Base" className="bg-amber-500/20 text-amber-300" />}
          {(tile.flags & 0x10) !== 0 && <Badge text="Scorched" className="bg-red-500/20 text-red-300" />}
          {(tile.flags & 0x04) !== 0 && <Badge text="Build Site" className="bg-blue-500/20 text-blue-300" />}
        </div>
      </div>
      
    </div>
  );
}

function Badge({ text, icon, className, style }: { text: string; icon?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${className ?? ''}`} style={style}>
      {icon && <img src={icon} alt={text} className="w-4 h-4" />}
      <span>
        {text}
      </span>
    </div>
  );
}
