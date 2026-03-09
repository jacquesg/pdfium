import type { ChangeEventHandler, FocusEventHandler, KeyboardEventHandler, ReactNode } from 'react';
import { columnLabelStyle } from './annotation-property-panel-support.js';

interface AnnotationPropertyPanelTextInputProps {
  readonly label: string;
  readonly onBlur: FocusEventHandler<HTMLInputElement>;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  readonly testId: string;
  readonly value: string;
}

export function AnnotationPropertyPanelTextInput({
  label,
  onBlur,
  onChange,
  onKeyDown,
  testId,
  value,
}: AnnotationPropertyPanelTextInputProps): ReactNode {
  return (
    <label style={columnLabelStyle}>
      {label}
      <input
        data-testid={testId}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        style={{ fontSize: 12 }}
      />
    </label>
  );
}
