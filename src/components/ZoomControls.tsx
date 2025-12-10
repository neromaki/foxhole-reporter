import React from 'react';
import { useMap } from 'react-leaflet';

interface ZoomControlProps {
  className?: string;
}


export function ZoomControls({ className }: ZoomControlProps) {
  const map = useMap();
  
  const handleZoomIn = () => {
    map.zoomIn();
  };
  
  const handleZoomOut = () => {
    map.zoomOut();
  };
  
  return (
    <div className="absolute top-36 md:top-3 inset-x-3 z-[900] flex flex-col gap-1 text-black text-xl">
      <button
        onClick={handleZoomIn}
        className="w-8 h-8 bg-white rounded shadow-md hover:bg-gray-100 flex items-center justify-center"
        aria-label="Zoom in"
      >
        <span>+</span>
      </button>
      <button
        onClick={handleZoomOut}
        className="w-8 h-8 bg-white rounded shadow-md hover:bg-gray-100 flex items-center justify-center"
        aria-label="Zoom out"
      >
        <span className="text-2xl">-</span>
      </button>
    </div>
  );
}