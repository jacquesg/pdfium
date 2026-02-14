import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedLink } from '../../../../src/context/protocol.js';
import type { WebLink } from '../../../../src/core/types.js';
import { LinkOverlay } from '../../../../src/react/components/link-overlay.js';

const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

beforeEach(() => {
  openSpy.mockClear();
});

afterAll(() => {
  openSpy.mockRestore();
});

describe('LinkOverlay', () => {
  it('opens URI links in a new tab and prevents default navigation', () => {
    const links: SerialisedLink[] = [
      {
        index: 0,
        bounds: { left: 10, top: 90, right: 30, bottom: 70 },
        action: { uri: 'https://example.com' } as SerialisedLink['action'],
        destination: undefined,
      },
    ];

    render(
      <LinkOverlay
        links={links}
        webLinks={[]}
        width={200}
        height={200}
        originalHeight={100}
        scale={2}
        onNavigate={vi.fn()}
      />,
    );

    const anchor = screen.getByRole('link', { name: 'https://example.com' });
    fireEvent.click(anchor);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    expect(anchor.getAttribute('href')).toBe('https://example.com');
    expect(anchor.style.left).toBe('20px');
    expect(anchor.style.top).toBe('20px');
    expect(anchor.style.width).toBe('40px');
    expect(anchor.style.height).toBe('40px');
  });

  it('navigates to in-document destinations', () => {
    const onNavigate = vi.fn();
    const links: SerialisedLink[] = [
      {
        index: 1,
        bounds: { left: 0, top: 100, right: 10, bottom: 90 },
        action: undefined,
        destination: { pageIndex: 2 } as SerialisedLink['destination'],
      },
    ];

    render(
      <LinkOverlay
        links={links}
        webLinks={[]}
        width={100}
        height={100}
        originalHeight={100}
        scale={1}
        onNavigate={onNavigate}
      />,
    );

    const anchor = screen.getByRole('link', { name: 'Go to page 3' });
    fireEvent.click(anchor);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(2);
    expect(openSpy).not.toHaveBeenCalled();
    expect(anchor.getAttribute('href')).toBe('#');
  });

  it('renders auto-detected web links for each rect', () => {
    const webLinks: WebLink[] = [
      {
        index: 7,
        url: 'https://docs.example.com',
        rects: [
          { left: 1, top: 10, right: 3, bottom: 9 },
          { left: 4, top: 8, right: 7, bottom: 6 },
        ],
      },
    ];

    render(
      <LinkOverlay
        links={[]}
        webLinks={webLinks}
        width={50}
        height={50}
        originalHeight={20}
        scale={2}
        onNavigate={vi.fn()}
      />,
    );

    const anchors = screen.getAllByRole('link', { name: 'https://docs.example.com' });
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
      expect(anchor.getAttribute('href')).toBe('https://docs.example.com');
    }
  });
});
