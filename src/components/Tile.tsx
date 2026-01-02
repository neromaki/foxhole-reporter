import React, { useState } from 'react';
import { useMapStore } from '../state/useMapStore';
import { LayerKey } from '../state/layers';

interface Props {
  k?: LayerKey;
  active: boolean;
  icon?: { type: string, url: URL, coords?: { x: number, y: number }, width?: number, height?: number } | null;
  label: string;
  counts?: object;
  callBack?: () => void;
}``

export function Tile({ k, active, icon, label, counts, callBack }: Props) {

  return (
    <button
      onClick={() => { if (callBack) callBack() }}
      className={`flex flex-col items-center transition-opacity max-w-[76px] gap-1 ${active ? 'opacity-100' : 'opacity-50'}`}
    >
      <div className={`border-2 ${active ? 'border-gray-100' : 'border-transparent'} rounded-2xl p-1`}>
        <div className={`w-16 h-16 rounded-xl bg-gray-700`}>
          { icon ? (
            'type' in icon && icon.type === 'sprite' ? (
              <div className={`w-16 h-16 scale-75`} style={{ 
                backgroundImage: icon && icon.url && `url(${icon.url.toString()})`, 
                backgroundPosition: icon && icon.coords && `-${icon.coords.x * 2}px -${icon.coords.y * 2}px`, 
                backgroundSize: icon && icon.width && icon.height && `${icon.width * 2}px ${icon.height * 2}px`, 
                backgroundRepeat: 'no-repeat' }}></div>
            ) : (
              <img src={icon.url.toString()} className="rounded-xl" />
            )
          ) : (
            <img src={new URL(`../images/Tile_${label}.png`, import.meta.url).href} className="rounded-xl" />
          ) }
        </div>
      </div>
      <span className={`text-sm`}>{label}</span>
      <span className={`hidden md:visible h-3 w-3 rounded-full}`}></span>
    </button>
  );
}

export default Tile;
