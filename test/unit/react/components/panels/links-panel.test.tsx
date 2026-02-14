import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedLink } from '../../../../../src/context/protocol.js';
import { ActionType, DestinationFitType, type WebLink } from '../../../../../src/core/types.js';

const mockViewerState = {
  viewer: {
    document: { id: 'doc-1' },
    navigation: {
      pageIndex: 0,
      pageCount: 3,
    },
  },
};

const mockLinksByPage = new Map<number, SerialisedLink[]>();
const mockWebLinksByPage = new Map<number, WebLink[]>();
const webLinksPageCalls: number[] = [];

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => mockViewerState,
}));

vi.mock('../../../../../src/react/hooks/use-links.js', () => ({
  useLinks: (_document: unknown, pageIndex: number) => ({
    data: mockLinksByPage.get(pageIndex),
  }),
}));

vi.mock('../../../../../src/react/hooks/use-web-links.js', () => ({
  useWebLinks: (_document: unknown, pageIndex: number) => {
    webLinksPageCalls.push(pageIndex);
    return { data: mockWebLinksByPage.get(pageIndex) };
  },
}));

const { LinksPanel } = await import('../../../../../src/react/components/panels/links-panel.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockLinksByPage.clear();
  mockWebLinksByPage.clear();
  webLinksPageCalls.length = 0;
});

beforeEach(() => {
  mockViewerState.viewer.navigation.pageIndex = 0;
  mockViewerState.viewer.navigation.pageCount = 3;
});

function makeSerialisedLink(overrides?: Partial<SerialisedLink>): SerialisedLink {
  return {
    index: 0,
    bounds: { left: 10, top: 20, right: 30, bottom: 40 },
    action: undefined,
    destination: undefined,
    ...overrides,
  };
}

function makeWebLink(overrides?: Partial<WebLink>): WebLink {
  return {
    index: 0,
    url: 'https://example.com',
    rects: [{ left: 1, top: 2, right: 3, bottom: 4 }],
    ...overrides,
  };
}

describe('LinksPanel', () => {
  it('shows link-tab empty state for the active page', () => {
    mockViewerState.viewer.navigation.pageIndex = 1;

    render(<LinksPanel />);

    expect(screen.getByText('No link annotations on page 2.')).toBeDefined();
  });

  it('renders link annotation targets for URI and destination links', () => {
    mockLinksByPage.set(0, [
      makeSerialisedLink({
        index: 1,
        action: {
          type: ActionType.URI,
          uri: 'https://example.com/docs',
          filePath: undefined,
        },
      }),
      makeSerialisedLink({
        index: 2,
        destination: {
          pageIndex: 2,
          fitType: DestinationFitType.Fit,
          x: undefined,
          y: undefined,
          zoom: undefined,
        },
      }),
      makeSerialisedLink({ index: 3 }),
    ]);

    render(<LinksPanel />);

    expect(screen.getByText('https://example.com/docs')).toBeDefined();
    expect(screen.getByText('GoTo Page 3')).toBeDefined();
    expect(screen.getByText('\u2014')).toBeDefined();
  });

  it('renders web-links tab with safe and blocked URLs', () => {
    mockWebLinksByPage.set(0, [
      makeWebLink({
        index: 1,
        url: 'https://safe.example',
        textRange: { startCharIndex: 4, charCount: 7 },
      }),
      makeWebLink({
        index: 2,
        url: 'javascript:alert(1)',
      }),
    ]);

    render(<LinksPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Web Links' }));

    expect(screen.getByText('2 web links found')).toBeDefined();
    expect(screen.getByRole('link', { name: 'https://safe.example' })).toBeDefined();
    const blocked = screen.getByText('javascript:alert(1)');
    expect(blocked.getAttribute('title')).toBe('Blocked: unsafe URL scheme');
    expect(screen.getByText('start: 4, count: 7')).toBeDefined();
  });

  it('clamps selected web-links page when pageCount shrinks', async () => {
    mockViewerState.viewer.navigation.pageCount = 5;
    const { rerender } = render(<LinksPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Web Links' }));

    const pageSelect = screen.getByLabelText('Page:') as HTMLSelectElement;
    fireEvent.change(pageSelect, { target: { value: '4' } });
    expect(webLinksPageCalls.at(-1)).toBe(4);

    mockViewerState.viewer.navigation.pageCount = 2;
    rerender(<LinksPanel />);

    await waitFor(() => {
      expect(webLinksPageCalls.at(-1)).toBe(1);
      expect(pageSelect.value).toBe('1');
    });
  });

  it('handles empty, whitespace, malformed, and very long URLs deterministically', () => {
    const veryLongUrl = `https://example.com/${'segment-'.repeat(220)}`;
    mockWebLinksByPage.set(0, [
      makeWebLink({ index: 1, url: '' }),
      makeWebLink({ index: 2, url: '   ' }),
      makeWebLink({ index: 3, url: 'http://[::1' }),
      makeWebLink({ index: 4, url: veryLongUrl }),
    ]);

    render(<LinksPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Web Links' }));

    const blocked = screen.getAllByTitle('Blocked: unsafe URL scheme');
    expect(blocked).toHaveLength(3);
    expect(screen.getByText('http://[::1')).toBeDefined();
    expect(screen.getByRole('link', { name: veryLongUrl })).toBeDefined();
  });

  it('uses unique web-links page selector ids across multiple panel instances', () => {
    const { container } = render(
      <>
        <LinksPanel />
        <LinksPanel />
      </>,
    );

    for (const tab of screen.getAllByRole('tab', { name: 'Web Links' })) {
      fireEvent.click(tab);
    }

    const pageSelects = Array.from(container.querySelectorAll<HTMLSelectElement>('select'));
    expect(pageSelects).toHaveLength(2);
    const ids = pageSelects.map((select) => select.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resets selected web-links page to viewer page on document switch', async () => {
    mockViewerState.viewer.navigation.pageCount = 5;
    mockViewerState.viewer.navigation.pageIndex = 1;
    const { rerender } = render(<LinksPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Web Links' }));

    const pageSelect = screen.getByLabelText('Page:') as HTMLSelectElement;
    fireEvent.change(pageSelect, { target: { value: '4' } });
    expect(webLinksPageCalls.at(-1)).toBe(4);

    mockViewerState.viewer.document = { id: 'doc-2' };
    mockViewerState.viewer.navigation.pageIndex = 0;
    rerender(<LinksPanel />);

    await waitFor(() => {
      expect(webLinksPageCalls.at(-1)).toBe(0);
      expect(pageSelect.value).toBe('0');
    });
  });
});
