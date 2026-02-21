import { useEffect, useState } from "react";

export function isTouchDevice(): boolean {
    return (
      (typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0)) ||
      false
    );
};


export function useOrientation() {
  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth
  );
  
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return { isPortrait, isLandscape: !isPortrait };
}

export function isMobilePortrait(): boolean {
    const orientation = useOrientation();
    return isTouchDevice() && orientation.isPortrait;
}