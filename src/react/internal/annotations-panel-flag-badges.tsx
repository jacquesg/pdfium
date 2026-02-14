'use client';

import { ANNOTATIONS_PANEL_COPY } from './annotations-panel-copy.js';
import {
  FLAG_BADGE_STYLE,
  FLAG_BADGES_CONTAINER_STYLE,
  FLAG_BADGES_EMPTY_STYLE,
} from './annotations-panel-view-styles.js';

interface AnnotationFlagBadgesProps {
  flags: number;
  decoder: (value: number) => string[];
}

function AnnotationFlagBadges({ flags, decoder }: AnnotationFlagBadgesProps) {
  const names = decoder(flags);
  if (names.length === 0) {
    return <span style={FLAG_BADGES_EMPTY_STYLE}>{ANNOTATIONS_PANEL_COPY.noneLabel}</span>;
  }

  return (
    <div style={FLAG_BADGES_CONTAINER_STYLE}>
      {names.map((name) => (
        <span key={name} style={FLAG_BADGE_STYLE}>
          {name}
        </span>
      ))}
    </div>
  );
}

export { AnnotationFlagBadges };
export type { AnnotationFlagBadgesProps };
