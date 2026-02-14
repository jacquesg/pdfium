import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlattenFlags, FlattenResult } from '../../../../../src/core/types.js';

const controllerValue = {
  widgets: [],
  hasForm: false,
  selectedIndex: null,
  onSelectIndex: vi.fn(),
  formError: null,
  onDismissError: vi.fn(),
  highlightColour: '#ffff00',
  onHighlightColourChange: vi.fn(),
  highlightAlpha: 100,
  highlightAlphaInputId: 'alpha-id',
  onHighlightAlphaChange: vi.fn(),
  onHighlightToggle: vi.fn(),
  highlightEnabled: false,
  onKillFocus: vi.fn(),
  onUndo: vi.fn(),
  confirmingFlatten: FlattenFlags.NormalDisplay as FlattenFlags | null,
  onFlatten: vi.fn(),
  flattenResult: FlattenResult.NothingToDo as FlattenResult | null,
};

const viewSpy = vi.fn();

vi.mock('../../../../../src/react/internal/use-forms-panel-controller.js', () => ({
  useFormsPanelController: () => controllerValue,
}));

vi.mock('../../../../../src/react/internal/forms-panel-view.js', () => ({
  FormsPanelView: (props: typeof controllerValue) => {
    viewSpy(props);
    return <div data-testid="forms-panel-view">{props.highlightColour}</div>;
  },
}));

const { FormsPanel } = await import('../../../../../src/react/components/panels/forms-panel.js');

describe('FormsPanel wrapper', () => {
  it('delegates rendering to FormsPanelView with controller props', () => {
    render(<FormsPanel />);

    expect(screen.getByTestId('forms-panel-view').textContent).toBe('#ffff00');
    expect(viewSpy).toHaveBeenCalledTimes(1);
    expect(viewSpy).toHaveBeenCalledWith(controllerValue);
  });
});
