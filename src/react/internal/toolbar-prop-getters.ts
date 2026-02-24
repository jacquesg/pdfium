import type { ChangeEventHandler, CSSProperties } from 'react';

interface ToolbarStyleOverrides {
  className?: string;
  style?: CSSProperties;
}

interface ToolbarButtonBase {
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  ariaPressed?: boolean | undefined;
}

interface ToolbarNumberInputBase {
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel: string;
}

interface ToolbarSearchInputBase {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  ariaLabel: string;
}

interface ToolbarSelectBase {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  ariaLabel: string;
}

function createToolbarButtonProps(base: ToolbarButtonBase, overrides?: ToolbarStyleOverrides) {
  return {
    type: 'button' as const,
    disabled: base.disabled,
    onClick: base.onClick,
    'aria-label': base.ariaLabel,
    ...(base.ariaPressed !== undefined ? { 'aria-pressed': base.ariaPressed } : {}),
    ...overrides,
  };
}

function createToolbarNumberInputProps(base: ToolbarNumberInputBase, overrides?: ToolbarStyleOverrides) {
  return {
    type: 'number' as const,
    min: base.min,
    max: base.max,
    value: base.value,
    disabled: base.disabled,
    onChange: base.onChange,
    'aria-label': base.ariaLabel,
    ...overrides,
  };
}

function createToolbarSearchInputProps(base: ToolbarSearchInputBase, overrides?: ToolbarStyleOverrides) {
  return {
    type: 'search' as const,
    value: base.value,
    onChange: base.onChange,
    placeholder: base.placeholder,
    'aria-label': base.ariaLabel,
    ...overrides,
  };
}

function createToolbarSelectProps(base: ToolbarSelectBase, overrides?: ToolbarStyleOverrides) {
  return {
    value: base.value,
    onChange: base.onChange,
    'aria-label': base.ariaLabel,
    ...overrides,
  };
}

export {
  createToolbarButtonProps,
  createToolbarNumberInputProps,
  createToolbarSearchInputProps,
  createToolbarSelectProps,
};
export type {
  ToolbarButtonBase,
  ToolbarNumberInputBase,
  ToolbarSearchInputBase,
  ToolbarSelectBase,
  ToolbarStyleOverrides,
};
