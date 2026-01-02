import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore, PanelType, ClickOutsideBehavior } from '../state/useMapStore';

export const SHEET_HEIGHTS = {
  off: 0,
  half: 250,
  full: 600,
};

interface BottomSheetProps {
  children: React.ReactNode;
  type: PanelType;
  allowFull?: boolean;
  clickOutsideBehavior?: ClickOutsideBehavior;
  title: string;
  headerContent?: React.ReactNode;
}

export function BottomSheet({
  children,
  type,
  allowFull = false,
  clickOutsideBehavior = null,
  title = '',
  headerContent = null,
}: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const panelState = useMapStore((s) => s.panelState[type]);
  const active = panelState !== 'off';
  const setPanelState = useMapStore((s) => s.setPanelState);
  const setPanelClickOutsideBehavior = useMapStore((s) => s.setPanelClickOutsideBehavior);

  // Drag state
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragVelocity, setDragVelocity] = useState(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Set the click outside behavior when component mounts
  useEffect(() => {
    if (clickOutsideBehavior !== null) {
      setPanelClickOutsideBehavior(type, clickOutsideBehavior);
    }
  }, [type, clickOutsideBehavior, setPanelClickOutsideBehavior]);

  // Calculate the visual transform based on state and drag offset
  const getTransformY = useCallback(() => {
    // Sheet is positioned at bottom-0, maxHeight controls visibility
    // We only need to apply dragOffset for interactive dragging
    // No base translation needed - the maxHeight does the work
    return dragOffset;
  }, [dragOffset]);

  // Determine valid states based on allowFull prop
  const getValidStates = useCallback((): (keyof typeof SHEET_HEIGHTS)[] => {
    return allowFull ? ['off', 'half', 'full'] : ['off', 'half'];
  }, [allowFull]);

  // Find the nearest valid state based on position and velocity
  const getNearestState = useCallback(
    (effectiveHeight: number, velocity: number): keyof typeof SHEET_HEIGHTS => {
      const validStates = getValidStates();

      // Velocity threshold for "throw" gestures (in pixels per millisecond)
      const velocityThreshold = 0.5;
      const isThrowingUp = velocity < -velocityThreshold; // Negative velocity = upward motion
      const isThrowingDown = velocity > velocityThreshold; // Positive velocity = downward motion

      // If user is throwing, prefer moving to next state
      if (isThrowingUp) {
        const currentIndex = validStates.indexOf(panelState);
        const nextStateIndex = Math.min(currentIndex + 1, validStates.length - 1);
        return validStates[nextStateIndex];
      }

      if (isThrowingDown) {
        const currentIndex = validStates.indexOf(panelState);
        const nextStateIndex = Math.max(currentIndex - 1, 0);
        return validStates[nextStateIndex];
      }

      // Otherwise, snap to nearest state based on effective height
      let nearestState = panelState;
      let minDistance = Math.abs(effectiveHeight - SHEET_HEIGHTS[panelState]);

      for (const state of validStates) {
        const distance = Math.abs(effectiveHeight - SHEET_HEIGHTS[state]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestState = state;
        }
      }

      return nearestState;
    },
    [panelState, getValidStates]
  );

  // Drag gesture handler
  const handleDragStart = (e: React.PointerEvent) => {
    setDragStartY(e.clientY);
    lastYRef.current = e.clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (dragStartY === null) return;

    const deltaY = e.clientY - lastYRef.current;
    const deltaTime = Date.now() - lastTimeRef.current;

    // Calculate velocity (pixels per millisecond)
    if (deltaTime > 0) {
      velocityRef.current = deltaY / deltaTime;
    }

    lastYRef.current = e.clientY;
    lastTimeRef.current = Date.now();

    // Update visual offset during drag
    // Positive deltaY = dragging down (hide more), negative = dragging up (show more)
    const totalDrag = e.clientY - dragStartY;
    const currentHeight = SHEET_HEIGHTS[panelState];
    
    // Limit how far up or down we can drag
    // Can't drag up beyond full state, can't drag down beyond off state
    const maxDragUp = allowFull ? SHEET_HEIGHTS.full - currentHeight : SHEET_HEIGHTS.half - currentHeight;
    const maxDragDown = currentHeight; // Can drag down to hide it completely

    const clampedDrag = Math.max(-maxDragUp, Math.min(maxDragDown, totalDrag));
    setDragOffset(clampedDrag);
  };

  const handleDragEnd = () => {
    if (dragStartY === null) return;

    const currentHeight = SHEET_HEIGHTS[panelState];
    // Positive dragOffset means dragged down (hiding), negative means dragged up (showing more)
    const effectiveHeight = currentHeight - dragOffset;
    const velocity = velocityRef.current;

    const nearestState = getNearestState(effectiveHeight, velocity);
    setPanelState(type, nearestState);

    setDragStartY(null);
    setDragOffset(0);
    velocityRef.current = 0;
  };

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      if (clickOutsideBehavior !== null) {
        setPanelState(type, clickOutsideBehavior);
      }
    }
  };

  const transformY = getTransformY();
  const easing = 'cubic-bezier(0.2, 0.0, 0, 1.0)';
  const transitionClass = dragStartY !== null ? '' : `transition-transform duration-[250ms]`;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-x-0 bottom-0 z-[450] h-screen pointer-events-none`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`w-full bg-gray-800 rounded-t-lg ${active ? 'p-4' : 'p-0'} ${transitionClass} fixed inset-x-0 bottom-0 z-[451] pointer-events-auto will-change-transform`}
        style={{
          transform: `translateY(${transformY}px)`,
          transitionTimingFunction: easing,
          maxHeight: `${SHEET_HEIGHTS[panelState]}px`,
        }}
      >
        {/* Drag handle - only show if allowFull */}        
        {allowFull && (
          <div
            className="flex justify-center py-2 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
          </div>
        )}
          {/* Title bar */}
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-semibold tracking-wide text-gray-300">{title}</h2>
            <div className={`flex items-center gap-2`}>
              <div>
                {headerContent}
              </div>
              <button 
                className="text-gray-400 hover:text-gray-200"
                onClick={() => setPanelState(type, 'off')}
                >
                  <img src={new URL(`../images/icn_close.png`, import.meta.url).href} className={`w-6 h-6`} />
              </button>
            </div>
          </div>

        {/* Content container */}
        <div className="w-full overflow-y-auto h-100"
        style={{ maxHeight: `${SHEET_HEIGHTS[panelState] - (28+28+16)}px`}}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;