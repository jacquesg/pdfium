import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ANNOTATIONS_PANEL_COPY } from '../../../../src/react/internal/annotations-panel-copy.js';
import { AnnotationFlagBadges } from '../../../../src/react/internal/annotations-panel-flag-badges.js';

describe('AnnotationFlagBadges', () => {
  it('renders the empty label when no flags are decoded', () => {
    const decoder = vi.fn().mockReturnValue([]);
    render(<AnnotationFlagBadges flags={0} decoder={decoder} />);

    expect(decoder).toHaveBeenCalledWith(0);
    expect(screen.getByText(ANNOTATIONS_PANEL_COPY.noneLabel)).toBeDefined();
  });

  it('renders one badge per decoded flag', () => {
    render(<AnnotationFlagBadges flags={3} decoder={() => ['Hidden', 'NoZoom']} />);

    expect(screen.getByText('Hidden')).toBeDefined();
    expect(screen.getByText('NoZoom')).toBeDefined();
  });
});
