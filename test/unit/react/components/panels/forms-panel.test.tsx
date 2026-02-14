import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentInfoResponse, SerialisedFormWidget } from '../../../../../src/context/protocol.js';
import { FormFieldType, FormType, PageMode } from '../../../../../src/core/types.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockViewerState = {
  viewer: {
    document: { id: 'mock-doc' },
    navigation: { pageIndex: 0, pageCount: 5, setPageIndex: vi.fn(), next: vi.fn(), prev: vi.fn() },
  },
  search: { totalMatches: 0, currentIndex: -1, isSearching: false },
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isSearchOpen: false,
  toggleSearch: vi.fn(),
  documentViewRef: { current: null },
};

const mockPanelState = {
  activePanel: 'forms',
  togglePanel: vi.fn(),
  setPanelOverlay: vi.fn(),
};

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => ({ ...mockViewerState, ...mockPanelState }),
  usePDFPanel: () => mockPanelState,
}));

const mockWidgetsData: SerialisedFormWidget[] = [];
let mockDocInfo: DocumentInfoResponse | undefined;
const mockKillFocus = vi.fn();
const mockSetHighlight = vi.fn();
const mockUndo = vi.fn();
const mockFlatten = vi.fn();

vi.mock('../../../../../src/react/hooks/use-form-widgets.js', () => ({
  useFormWidgets: () => ({ data: mockWidgetsData }),
}));

vi.mock('../../../../../src/react/hooks/use-document-info.js', () => ({
  useDocumentInfo: () => ({ data: mockDocInfo }),
}));

vi.mock('../../../../../src/react/hooks/use-document-form-actions.js', () => ({
  useDocumentFormActions: () => ({
    killFocus: mockKillFocus,
    setHighlight: mockSetHighlight,
  }),
}));

vi.mock('../../../../../src/react/hooks/use-page-form-actions.js', () => ({
  usePageFormActions: () => ({
    undo: mockUndo,
    flatten: mockFlatten,
  }),
}));

const { FormsPanel } = await import('../../../../../src/react/components/panels/forms-panel.js');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockWidgetsData.length = 0;
  mockDocInfo = undefined;
  mockViewerState.viewer.navigation.pageIndex = 0;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWidget(overrides?: Partial<SerialisedFormWidget>): SerialisedFormWidget {
  return {
    annotationIndex: 0,
    fieldName: 'firstName',
    fieldType: FormFieldType.Unknown,
    fieldValue: 'John',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormsPanel', () => {
  it('renders widget list with field names', () => {
    mockWidgetsData.push(
      makeWidget({ fieldName: 'firstName', fieldValue: 'John' }),
      makeWidget({ fieldName: 'lastName', fieldValue: 'Doe', annotationIndex: 1 }),
    );

    render(<FormsPanel />);

    expect(screen.getByText('firstName')).toBeDefined();
    expect(screen.getByText('lastName')).toBeDefined();
  });

  it('shows "Form Detected" badge when document has a form', () => {
    mockDocInfo = {
      isTagged: false,
      hasForm: true,
      formType: FormType.AcroForm,
      namedDestinationCount: 0,
      pageMode: PageMode.UseNone,
    };

    render(<FormsPanel />);

    expect(screen.getByText('Form Detected')).toBeDefined();
  });

  it('shows "No Form" badge when document has no form', () => {
    mockDocInfo = {
      isTagged: false,
      hasForm: false,
      formType: FormType.None,
      namedDestinationCount: 0,
      pageMode: PageMode.UseNone,
    };

    render(<FormsPanel />);

    expect(screen.getByText('No Form')).toBeDefined();
  });

  it('calls show form fields toggle on button click', async () => {
    mockSetHighlight.mockResolvedValue(undefined);

    render(<FormsPanel />);

    const enableBtn = screen.getByRole('button', { name: 'Show Form Fields' });
    await act(async () => {
      enableBtn.click();
    });

    expect(mockSetHighlight).toHaveBeenCalledOnce();
  });

  it('shows empty state when no widgets exist', () => {
    render(<FormsPanel />);

    expect(screen.getByText('No form widgets on this page')).toBeDefined();
  });

  it('calls undo action on button click', async () => {
    mockUndo.mockResolvedValue(true);

    render(<FormsPanel />);

    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    await act(async () => {
      undoBtn.click();
    });

    expect(mockUndo).toHaveBeenCalledOnce();
  });

  it('calls flatten action on "Flatten for Display" double click (confirmation)', async () => {
    mockFlatten.mockResolvedValue('Success');

    render(<FormsPanel />);

    // First click enters confirmation state
    const flattenBtn = screen.getByRole('button', { name: 'Flatten for Display' });
    await act(async () => {
      flattenBtn.click();
    });

    expect(mockFlatten).not.toHaveBeenCalled();

    // Second click (now labelled "Confirm flatten?") executes the action
    const confirmBtn = screen.getByRole('button', { name: 'Confirm flatten?' });
    await act(async () => {
      confirmBtn.click();
    });

    expect(mockFlatten).toHaveBeenCalledOnce();
  });

  it('shows error alert on action failure', async () => {
    mockUndo.mockRejectedValue(new Error('Undo operation failed'));

    render(<FormsPanel />);

    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    await act(async () => {
      undoBtn.click();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain('Undo operation failed');
  });

  it('dismisses error alert on close button click', async () => {
    mockUndo.mockRejectedValue(new Error('Something went wrong'));

    render(<FormsPanel />);

    // Trigger error
    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    await act(async () => {
      undoBtn.click();
    });

    expect(screen.getByRole('alert')).toBeDefined();

    // Dismiss
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss error' });
    act(() => {
      dismissBtn.click();
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('displays widget field type and value', () => {
    mockWidgetsData.push(
      makeWidget({ fieldName: 'email', fieldType: FormFieldType.Unknown, fieldValue: 'test@example.com' }),
    );

    render(<FormsPanel />);

    expect(screen.getByText('email')).toBeDefined();
    expect(screen.getByText(/Val: test@example.com/)).toBeDefined();
  });

  it('renders "Flatten for Print" button', () => {
    render(<FormsPanel />);

    expect(screen.getByRole('button', { name: 'Flatten for Print' })).toBeDefined();
  });

  it('renders "Kill Focus" button and calls killFocus on click', async () => {
    mockKillFocus.mockResolvedValue(true);

    render(<FormsPanel />);

    const killBtn = screen.getByRole('button', { name: 'Kill Focus' });
    await act(async () => {
      killBtn.click();
    });

    expect(mockKillFocus).toHaveBeenCalledOnce();
  });

  it('selects a widget on click and shows detail section', () => {
    mockWidgetsData.push(
      makeWidget({ fieldName: 'firstName', fieldValue: 'John', annotationIndex: 0 }),
      makeWidget({ fieldName: 'lastName', fieldValue: 'Doe', annotationIndex: 1 }),
    );

    render(<FormsPanel />);

    const listbox = screen.getByRole('listbox', { name: 'Form widgets' });
    expect(listbox).toBeDefined();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);

    // Click first widget
    act(() => {
      options[0]!.click();
    });

    // Should be selected
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');

    // Detail section should appear with "Widget Detail" heading
    expect(screen.getByText('Widget Detail')).toBeDefined();
  });

  it('deselects a widget when clicked again', () => {
    mockWidgetsData.push(makeWidget({ fieldName: 'email', fieldValue: 'test@example.com' }));

    render(<FormsPanel />);

    const option = screen.getByRole('option');

    // Select
    act(() => {
      option.click();
    });
    expect(option.getAttribute('aria-selected')).toBe('true');

    // Deselect
    act(() => {
      option.click();
    });
    expect(option.getAttribute('aria-selected')).toBe('false');
    expect(screen.queryByText('Widget Detail')).toBeNull();
  });

  it('shows widget detail fields (field name, type, value, annotation index)', () => {
    mockWidgetsData.push(
      makeWidget({ fieldName: 'phone', fieldType: FormFieldType.Unknown, fieldValue: '555-0100', annotationIndex: 3 }),
    );

    render(<FormsPanel />);

    const option = screen.getByRole('option');
    act(() => {
      option.click();
    });

    // Labels in the detail grid
    expect(screen.getByText('Field')).toBeDefined();
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
    expect(screen.getByText('Annotation Index')).toBeDefined();
  });

  it('has ARIA attributes on highlight alpha range slider', () => {
    render(<FormsPanel />);

    const slider = screen.getByRole('slider', { name: 'Highlight alpha' });
    expect(slider).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('255');
    expect(slider.getAttribute('aria-valuetext')).toBe('Alpha 100 of 255');
  });

  it('adds data-panel-item attribute to widget buttons', () => {
    mockWidgetsData.push(makeWidget());

    const { container } = render(<FormsPanel />);

    const panelItems = container.querySelectorAll('[data-panel-item]');
    expect(panelItems.length).toBeGreaterThanOrEqual(1);
  });

  it('uses unique highlight-alpha input ids across multiple panel instances', () => {
    const { container } = render(
      <>
        <FormsPanel />
        <FormsPanel />
      </>,
    );

    const sliders = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="range"]'));
    expect(sliders).toHaveLength(2);
    const ids = sliders.map((slider) => slider.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores stale flatten completion after page navigation', async () => {
    const pendingFlatten = deferred<string>();
    mockFlatten.mockReturnValueOnce(pendingFlatten.promise);

    const { rerender } = render(<FormsPanel />);

    const flattenBtn = screen.getByRole('button', { name: 'Flatten for Display' });
    await act(async () => {
      flattenBtn.click();
    });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm flatten?' });
    await act(async () => {
      confirmBtn.click();
    });

    mockViewerState.viewer.navigation.pageIndex = 1;
    rerender(<FormsPanel />);

    await act(async () => {
      pendingFlatten.resolve('Success');
      await Promise.resolve();
    });

    expect(screen.queryByText('Result: Success')).toBeNull();
  });

  it('ignores timer-delayed stale flatten completion after page navigation', async () => {
    vi.useFakeTimers();
    mockFlatten.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('Success'), 25);
      }),
    );

    const { rerender } = render(<FormsPanel />);

    const flattenBtn = screen.getByRole('button', { name: 'Flatten for Display' });
    await act(async () => {
      flattenBtn.click();
    });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm flatten?' });
    await act(async () => {
      confirmBtn.click();
    });

    mockViewerState.viewer.navigation.pageIndex = 1;
    rerender(<FormsPanel />);

    await act(async () => {
      vi.advanceTimersByTime(25);
      await Promise.resolve();
    });

    expect(screen.queryByText('Result: Success')).toBeNull();
    vi.useRealTimers();
  });

  it('ignores stale highlight failure when a newer highlight toggle succeeds', async () => {
    const firstToggle = deferred<void>();
    mockSetHighlight.mockReturnValueOnce(firstToggle.promise).mockReturnValueOnce(Promise.resolve(undefined));

    render(<FormsPanel />);

    const showFieldsButton = screen.getByRole('button', { name: 'Show Form Fields' });
    await act(async () => {
      showFieldsButton.click();
      showFieldsButton.click();
      await Promise.resolve();
    });

    expect(mockSetHighlight).toHaveBeenCalledTimes(2);

    await waitForNoAlert();

    await act(async () => {
      firstToggle.reject(new Error('stale highlight failure'));
      await Promise.resolve();
    });

    await waitForNoAlert();
  });
});

async function waitForNoAlert() {
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByRole('alert')).toBeNull();
}
