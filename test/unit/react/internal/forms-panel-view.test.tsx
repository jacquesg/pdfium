import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlattenFlags, FormFieldType } from '../../../../src/core/types.js';
import { FormsPanelView } from '../../../../src/react/internal/forms-panel-view.js';

describe('forms-panel-view', () => {
  it('renders empty state when there are no widgets', () => {
    render(
      <FormsPanelView
        widgets={[]}
        hasForm={false}
        selectedIndex={null}
        onSelectIndex={vi.fn()}
        formError={null}
        onDismissError={vi.fn()}
        highlightColour="#FFFF00"
        onHighlightColourChange={vi.fn()}
        highlightAlpha={100}
        highlightAlphaInputId="alpha"
        onHighlightAlphaChange={vi.fn()}
        onHighlightToggle={vi.fn()}
        highlightEnabled={false}
        onKillFocus={vi.fn()}
        onUndo={vi.fn()}
        confirmingFlatten={null}
        onFlatten={vi.fn()}
        flattenResult={null}
      />,
    );

    expect(screen.getByText('No form widgets on this page')).toBeDefined();
    expect(screen.getByText('No Form')).toBeDefined();
  });

  it('invokes selection callback when a widget is clicked', () => {
    const onSelectIndex = vi.fn();

    render(
      <FormsPanelView
        widgets={[
          {
            annotationIndex: 1,
            fieldName: 'email',
            fieldType: FormFieldType.Unknown,
            fieldValue: 'user@example.com',
          },
        ]}
        hasForm
        selectedIndex={null}
        onSelectIndex={onSelectIndex}
        formError={null}
        onDismissError={vi.fn()}
        highlightColour="#FFFF00"
        onHighlightColourChange={vi.fn()}
        highlightAlpha={100}
        highlightAlphaInputId="alpha"
        onHighlightAlphaChange={vi.fn()}
        onHighlightToggle={vi.fn()}
        highlightEnabled={false}
        onKillFocus={vi.fn()}
        onUndo={vi.fn()}
        confirmingFlatten={null}
        onFlatten={vi.fn()}
        flattenResult={null}
      />,
    );

    fireEvent.click(screen.getByRole('option'));
    expect(onSelectIndex).toHaveBeenCalledWith(0);
  });

  it('shows confirmation label for flatten button when matching flag is pending', () => {
    render(
      <FormsPanelView
        widgets={[]}
        hasForm
        selectedIndex={null}
        onSelectIndex={vi.fn()}
        formError={null}
        onDismissError={vi.fn()}
        highlightColour="#FFFF00"
        onHighlightColourChange={vi.fn()}
        highlightAlpha={100}
        highlightAlphaInputId="alpha"
        onHighlightAlphaChange={vi.fn()}
        onHighlightToggle={vi.fn()}
        highlightEnabled={false}
        onKillFocus={vi.fn()}
        onUndo={vi.fn()}
        confirmingFlatten={FlattenFlags.Print}
        onFlatten={vi.fn()}
        flattenResult={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm flatten?' })).toBeDefined();
  });
});
