import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InteractionMode } from '../../../../../src/react/hooks/use-interaction-mode.js';

// ── Mock data (mutable so individual tests can override) ─────

let mockMetadata: {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
} | null = null;

let mockPermissions: {
  raw: number;
  canPrint: boolean;
  canModifyContents: boolean;
  canCopyOrExtract: boolean;
  canAddOrModifyAnnotations: boolean;
  canFillForms: boolean;
  canExtractForAccessibility: boolean;
  canAssemble: boolean;
  canPrintHighQuality: boolean;
} | null = null;

let mockViewerPrefs: {
  printScaling: boolean;
  numCopies: number;
  duplexMode: string;
} | null = null;

let mockSignatures: {
  index: number;
  contents: ArrayBuffer | undefined;
  byteRange: number[] | undefined;
  subFilter: string | undefined;
  reason: string | undefined;
  time: string | undefined;
  docMDPPermission: number;
}[] = [];

let mockJsActions: { name: string; script: string }[] = [];

let mockExtInfo: {
  fileVersion: number | undefined;
  rawPermissions: number;
  securityHandlerRevision: number;
  signatureCount: number;
  hasValidCrossReferenceTable: boolean;
} | null = null;

let mockDocInfo: {
  isTagged: boolean;
  hasForm: boolean;
  formType: string;
  namedDestinationCount: number;
  pageMode: string;
} | null = null;

let mockPrintRanges: number[] | null = null;

const mockViewerResult = {
  viewer: {
    document: { id: 'mock-doc', pageCount: 5 },
    navigation: {
      pageIndex: 0,
      setPageIndex: vi.fn(),
      pageCount: 5,
      next: vi.fn(),
      prev: vi.fn(),
      canNext: true,
      canPrev: false,
    },
    zoom: {
      scale: 1,
      setScale: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      canZoomIn: true,
      canZoomOut: true,
    },
    fit: { fitWidth: vi.fn(), fitPage: vi.fn(), fitScale: vi.fn(), activeFitMode: null },
    scroll: { scrollMode: 'continuous' as const, setScrollMode: vi.fn() },
    container: {
      ref: { current: null },
      dimensions: [{ width: 612, height: 792 }],
      zoomAnchorRef: { current: null },
    },
    rotation: { getRotation: vi.fn().mockReturnValue(0), rotatePage: vi.fn(), resetRotation: vi.fn() },
    fullscreen: { isFullscreen: false, toggleFullscreen: vi.fn() },
    spread: { spreadMode: 'none' as const, setSpreadMode: vi.fn() },
    print: { print: vi.fn() },
    interaction: { mode: 'pointer' as InteractionMode, setMode: vi.fn(), marqueeRect: null },
  },
  search: {
    totalMatches: 0,
    currentIndex: -1,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    resultsByPage: new Map(),
    matchIndexMap: [],
    currentMatchPageIndex: undefined,
  },
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isSearchOpen: false,
  toggleSearch: vi.fn(),
  documentViewRef: { current: null },
  activePanel: 'info',
  togglePanel: vi.fn(),
  setPanelOverlay: vi.fn(),
};

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => mockViewerResult,
  usePDFPanel: () => ({
    activePanel: mockViewerResult.activePanel,
    togglePanel: mockViewerResult.togglePanel,
    setPanelOverlay: mockViewerResult.setPanelOverlay,
  }),
}));

vi.mock('../../../../../src/react/hooks/use-metadata.js', () => ({
  useMetadata: () => ({ data: mockMetadata }),
}));

vi.mock('../../../../../src/react/hooks/use-permissions.js', () => ({
  usePermissions: () => ({ data: mockPermissions }),
}));

vi.mock('../../../../../src/react/hooks/use-viewer-preferences.js', () => ({
  useViewerPreferences: () => ({ data: mockViewerPrefs }),
}));

vi.mock('../../../../../src/react/hooks/use-signatures.js', () => ({
  useSignatures: () => ({ data: mockSignatures }),
}));

vi.mock('../../../../../src/react/hooks/use-javascript-actions.js', () => ({
  useJavaScriptActions: () => ({ data: mockJsActions }),
}));

vi.mock('../../../../../src/react/hooks/use-extended-document-info.js', () => ({
  useExtendedDocumentInfo: () => ({ data: mockExtInfo }),
}));

vi.mock('../../../../../src/react/hooks/use-document-info.js', () => ({
  useDocumentInfo: () => ({ data: mockDocInfo }),
}));

vi.mock('../../../../../src/react/hooks/use-print-page-ranges.js', () => ({
  usePrintPageRanges: () => ({ data: mockPrintRanges }),
}));

const { InfoPanel } = await import('../../../../../src/react/components/panels/info-panel.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockMetadata = null;
  mockPermissions = null;
  mockViewerPrefs = null;
  mockSignatures = [];
  mockJsActions = [];
  mockExtInfo = null;
  mockDocInfo = null;
  mockPrintRanges = null;
});

describe('InfoPanel', () => {
  it('renders metadata section with title, author, etc.', () => {
    mockMetadata = {
      title: 'Test Document',
      author: 'Jane Smith',
      subject: 'Unit Testing',
      creator: 'TestApp',
      producer: 'PDFium',
      creationDate: '2024-01-15',
      modificationDate: '2024-06-20',
    };
    mockExtInfo = {
      fileVersion: 17,
      rawPermissions: 0xffffffff,
      securityHandlerRevision: 3,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    };

    render(<InfoPanel />);

    expect(screen.getByText('Test Document')).toBeDefined();
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('Unit Testing')).toBeDefined();
    expect(screen.getByText('TestApp')).toBeDefined();
    expect(screen.getByText('PDFium')).toBeDefined();
    expect(screen.getByText('2024-01-15')).toBeDefined();
    expect(screen.getByText('2024-06-20')).toBeDefined();
  });

  it('renders permissions with boolean badges', () => {
    mockPermissions = {
      raw: 0xffffffff,
      canPrint: true,
      canModifyContents: false,
      canCopyOrExtract: true,
      canAddOrModifyAnnotations: false,
      canFillForms: true,
      canExtractForAccessibility: true,
      canAssemble: false,
      canPrintHighQuality: true,
    };
    mockExtInfo = {
      fileVersion: 17,
      rawPermissions: 0xffffffff,
      securityHandlerRevision: 3,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    };

    render(<InfoPanel />);

    // The PropertyTable renders boolean values as "true" / "false" badge spans
    const trueSpans = screen.getAllByText('true');
    const falseSpans = screen.getAllByText('false');
    expect(trueSpans.length).toBeGreaterThanOrEqual(5);
    expect(falseSpans.length).toBeGreaterThanOrEqual(3);
  });

  it('renders viewer preferences', () => {
    mockViewerPrefs = {
      printScaling: true,
      numCopies: 2,
      duplexMode: 'Simplex',
    };
    mockPrintRanges = [1, 3, 5, 7];

    render(<InfoPanel />);

    expect(screen.getByText('Print Scaling')).toBeDefined();
    expect(screen.getByText('Num Copies')).toBeDefined();
    expect(screen.getByText('Duplex Mode')).toBeDefined();
    expect(screen.getByText('1, 3, 5, 7')).toBeDefined();
  });

  it('renders signatures table', () => {
    mockSignatures = [
      {
        index: 0,
        contents: new ArrayBuffer(64),
        byteRange: [0, 100, 200, 300],
        subFilter: 'adbe.pkcs7.detached',
        reason: 'Approval',
        time: '2024-03-15T10:00:00Z',
        docMDPPermission: 2,
      },
    ];

    render(<InfoPanel />);

    expect(screen.getByText('Approval')).toBeDefined();
    expect(screen.getByText('2024-03-15T10:00:00Z')).toBeDefined();
    expect(screen.getByText('adbe.pkcs7.detached')).toBeDefined();
    expect(screen.getByText('0, 100, 200, 300')).toBeDefined();
  });

  it('renders javascript code blocks', () => {
    mockJsActions = [
      { name: 'OpenAction', script: 'app.alert("Hello");' },
      { name: 'PrintAction', script: 'this.print();' },
    ];

    render(<InfoPanel />);

    expect(screen.getByText('OpenAction')).toBeDefined();
    expect(screen.getByText('app.alert("Hello");')).toBeDefined();
    expect(screen.getByText('PrintAction')).toBeDefined();
    expect(screen.getByText('this.print();')).toBeDefined();
  });

  it('sections are collapsible', () => {
    mockMetadata = {
      title: 'Collapsible Test',
      author: 'Author',
    };
    mockExtInfo = {
      fileVersion: 17,
      rawPermissions: 0xffffffff,
      securityHandlerRevision: 3,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    };

    render(<InfoPanel />);

    // Metadata section is visible initially
    expect(screen.getByText('Collapsible Test')).toBeDefined();

    // Click the Metadata section header to collapse it
    const metadataButton = screen.getByRole('button', { name: /Metadata/ });
    fireEvent.click(metadataButton);

    // The content should now be hidden
    expect(screen.queryByText('Collapsible Test')).toBeNull();

    // Click again to expand
    fireEvent.click(metadataButton);
    expect(screen.getByText('Collapsible Test')).toBeDefined();
  });

  it('handles null/missing data gracefully', () => {
    // All data hooks return null — the panel should render loading states
    render(<InfoPanel />);

    // Should show Loading... text for sections with no data
    const loadingTexts = screen.getAllByText('Loading...');
    expect(loadingTexts.length).toBeGreaterThanOrEqual(1);

    // No signatures — shows "No signatures found"
    expect(screen.getByText('No signatures found')).toBeDefined();

    // No JS actions — shows "No JavaScript actions found"
    expect(screen.getByText('No JavaScript actions found')).toBeDefined();
  });

  it('shows empty state when no document is loaded', () => {
    const originalDoc = mockViewerResult.viewer.document;
    (mockViewerResult.viewer as Record<string, unknown>).document = null;

    render(<InfoPanel />);

    expect(screen.getByText('Load a PDF to inspect its metadata and properties.')).toBeDefined();

    (mockViewerResult.viewer as Record<string, unknown>).document = originalDoc;
  });
});
