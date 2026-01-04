import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore, PanelType, ClickOutsideBehavior, PanelState } from '../state/useMapStore';
import { isTouchDevice } from '../lib/devices';

export const SHEET_HEIGHTS = {
  off: 0,
  half: 250,
  threequarters: 380,
  full: 600,
};

interface BottomSheetProps {
  children: React.ReactNode;
  type: PanelType;
  allowedStates: PanelState[];
  clickOutsideBehavior?: ClickOutsideBehavior;
  closeBehavior?: (() => void) | null;
  title: string;
  icon?: string | null;
  headerContent?: React.ReactNode;
}

export function BottomSheet({
  children,
  type,
  allowedStates = ['off'] as PanelState[],
  clickOutsideBehavior = null,
  closeBehavior = null,
  title = '',
  icon = null,
  headerContent = null,
}: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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

  allowedStates = ['off', ...allowedStates];

  const [isTouch] = React.useState(isTouchDevice());

  // Set the click outside behavior when component mounts
  useEffect(() => {
    if (clickOutsideBehavior !== null) {
      setPanelClickOutsideBehavior(type, clickOutsideBehavior);
    }
  }, [type, clickOutsideBehavior, setPanelClickOutsideBehavior]);

  // Reset scroll position when panel closes
  useEffect(() => {
    if (panelState === 'off' && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [panelState]);

  // Calculate the visual transform based on state and drag offset
  const getTransformY = useCallback(() => {
    return dragOffset;
  }, [dragOffset]);

  // Find the nearest valid state based on position and velocity
  const getNearestState = useCallback(
    (effectiveHeight: number, velocity: number): PanelState => {
      // Velocity threshold for "throw" gestures (in pixels per millisecond)
      const velocityThreshold = 0.5;
      const isThrowingUp = velocity < -velocityThreshold;
      const isThrowingDown = velocity > velocityThreshold;

      // If user is throwing, prefer moving to next state
      if (isThrowingUp) {
        const currentIndex = allowedStates.indexOf(panelState);
        const nextStateIndex = Math.min(currentIndex + 1, allowedStates.length - 1);
        return allowedStates[nextStateIndex];
      }

      if (isThrowingDown) {
        const currentIndex = allowedStates.indexOf(panelState);
        const nextStateIndex = Math.max(currentIndex - 1, 0);
        return allowedStates[nextStateIndex];
      }

      // Otherwise, snap to nearest state based on effective height
      let nearestState = panelState;
      let minDistance = Math.abs(effectiveHeight - SHEET_HEIGHTS[panelState]);

      for (const state of allowedStates) {
        const distance = Math.abs(effectiveHeight - SHEET_HEIGHTS[state]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestState = state;
        }
      }

      return nearestState;
    },
    [panelState, allowedStates]
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

    if (deltaTime > 0) {
      velocityRef.current = deltaY / deltaTime;
    }

    lastYRef.current = e.clientY;
    lastTimeRef.current = Date.now();

    const totalDrag = e.clientY - dragStartY;
    const currentHeight = SHEET_HEIGHTS[panelState];
    
    const maxDragUp = allowedStates.includes('full') ? SHEET_HEIGHTS.full - currentHeight : SHEET_HEIGHTS.half - currentHeight;
    const maxDragDown = currentHeight;

    const clampedDrag = Math.max(-maxDragUp, Math.min(maxDragDown, totalDrag));
    setDragOffset(clampedDrag);
  };

  const handleDragEnd = () => {
    if (dragStartY === null) return;

    const currentHeight = SHEET_HEIGHTS[panelState];
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
  const showDragHandle = allowedStates.length > 2;

  return (
    <div
      ref={containerRef}
      className={`${type}-${panelState} ${type} fixed inset-x-0 bottom-0 md:left-0 md:right-auto md:bottom-auto z-[450] h-screen pointer-events-none transition-transform duration-[250ms]`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={
          `w-full md:w-[28rem] bg-gray-800 rounded-t-lg md:rounded-tl-none md:rounded-br-lg ${active ? 'px-2 pt-4' : 'p-0'} md:px-2 md:pt-4 transition-all duration-[250ms] fixed inset-x-0 bottom-0 md:left-0 md:right-auto ${type == 'report' ? `md:bottom-0` : `md:bottom-auto`} md:-translate-x-full ${panelState !== 'off' ? 'md:translate-x-0' : ''} z-[451] pointer-events-auto will-change-transform`}
        style={{
          transform: `${isTouch ? `translateY(${transformY}px)` : ``}`,
          //transitionTimingFunction: easing,
          maxHeight: `${isTouch ? `${SHEET_HEIGHTS[panelState]}px` : ''}`,
          
        }}
      >
        {showDragHandle && (
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
          <div className="flex items-center justify-between pb-4">
            <div className={`flex items-center gap-1`}>
              {icon && <img src={icon} alt={title} className="w-6 h-6" />}
              <h2 className="text-lg font-semibold tracking-wide text-gray-300">{title}</h2>
            </div>
            <div className={`flex items-center gap-2`}>
              <div className={`mr-2`}>
                {headerContent}
              </div>
              <button 
                className="text-gray-400 hover:text-gray-200"
                onClick={closeBehavior ? closeBehavior : () => setPanelState(type, 'off')}
                >
                  <img src={new URL(`../images/icn_close.png`, import.meta.url).href} className={`w-6 h-6`} />
              </button>
            </div>
          </div>

        {/* Content container */}
        <div 
          ref={contentRef}
          className="w-full overflow-y-auto h-100 pb-4"
          style={{maxHeight: `${isTouch? `${SHEET_HEIGHTS[panelState] - (showDragHandle ? (28+28+16) : (44+16))}px` : '100vh'}`}}
          >
          {children}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;