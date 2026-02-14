import { describe, expect, it, vi } from 'vitest';
import {
  createToolbarButtonProps,
  createToolbarNumberInputProps,
  createToolbarSearchInputProps,
  createToolbarSelectProps,
} from '../../../../src/react/internal/toolbar-prop-getters.js';

describe('toolbar-prop-getters', () => {
  it('builds button props and merges overrides', () => {
    const onClick = vi.fn();
    const props = createToolbarButtonProps(
      {
        disabled: false,
        onClick,
        ariaLabel: 'Do thing',
        ariaPressed: true,
      },
      { className: 'btn', style: { padding: 4 } },
    );

    expect(props.type).toBe('button');
    expect(props.disabled).toBe(false);
    expect(props.onClick).toBe(onClick);
    expect(props['aria-label']).toBe('Do thing');
    expect(props['aria-pressed']).toBe(true);
    expect(props.className).toBe('btn');
    expect(props.style).toEqual({ padding: 4 });
  });

  it('omits aria-pressed when not provided', () => {
    const props = createToolbarButtonProps({
      disabled: true,
      onClick: vi.fn(),
      ariaLabel: 'Disabled',
    });

    expect(props).not.toHaveProperty('aria-pressed');
  });

  it('builds number input props with numeric constraints', () => {
    const onChange = vi.fn();
    const props = createToolbarNumberInputProps({
      min: 1,
      max: 10,
      value: 3,
      disabled: false,
      onChange,
      ariaLabel: 'Page number',
    });

    expect(props.type).toBe('number');
    expect(props.min).toBe(1);
    expect(props.max).toBe(10);
    expect(props.value).toBe(3);
    expect(props.disabled).toBe(false);
    expect(props.onChange).toBe(onChange);
    expect(props['aria-label']).toBe('Page number');
  });

  it('builds search input props and select props', () => {
    const onSearchChange = vi.fn();
    const searchProps = createToolbarSearchInputProps({
      value: 'needle',
      onChange: onSearchChange,
      placeholder: 'Search...',
      ariaLabel: 'Search in document',
    });

    expect(searchProps.type).toBe('search');
    expect(searchProps.value).toBe('needle');
    expect(searchProps.onChange).toBe(onSearchChange);
    expect(searchProps.placeholder).toBe('Search...');
    expect(searchProps['aria-label']).toBe('Search in document');

    const onSelectChange = vi.fn();
    const selectProps = createToolbarSelectProps({
      value: 'continuous',
      onChange: onSelectChange,
      ariaLabel: 'Scroll mode',
    });

    expect(selectProps.value).toBe('continuous');
    expect(selectProps.onChange).toBe(onSelectChange);
    expect(selectProps['aria-label']).toBe('Scroll mode');
  });
});
