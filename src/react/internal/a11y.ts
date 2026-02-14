'use client';

import type { CSSProperties } from 'react';

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
};

export { VISUALLY_HIDDEN_STYLE };
