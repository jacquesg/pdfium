import type { ChangeEventHandler, FocusEventHandler, KeyboardEventHandler, ReactNode } from 'react';
import { columnLabelStyle } from './annotation-property-panel-support.js';

interface AnnotationPropertyPanelTextareaProps {
  readonly label: string;
  readonly onBlur: FocusEventHandler<HTMLTextAreaElement>;
  readonly onChange: ChangeEventHandler<HTMLTextAreaElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly rows?: number;
  readonly testId: string;
  readonly value: string;
}

export function AnnotationPropertyPanelTextarea({
  label,
  onBlur,
  onChange,
  onKeyDown,
  rows = 3,
  testId,
  value,
}: AnnotationPropertyPanelTextareaProps): ReactNode {
  return (
    <label style={columnLabelStyle}>
      {label}
      <textarea
        data-testid={testId}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        rows={rows}
        style={{ fontSize: 12, resize: 'vertical' }}
      />
    </label>
  );
}
