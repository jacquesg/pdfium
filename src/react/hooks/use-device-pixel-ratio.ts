'use client';

import { useEffect, useState } from 'react';

/**
 * Reactively tracks `window.devicePixelRatio`. Re-subscribes when DPR changes
 * (e.g. window dragged between monitors with different pixel densities).
 */
function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => (typeof window !== 'undefined' ? window.devicePixelRatio : 1));

  useEffect(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      setDpr(window.devicePixelRatio);
    };
    const mql = matchMedia(`(resolution: ${dpr}dppx)`);
    mql.addEventListener('change', update);
    return () => {
      active = false;
      mql.removeEventListener('change', update);
    };
  }, [dpr]);

  return dpr;
}

export { useDevicePixelRatio };
