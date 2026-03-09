import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface AnnotationPropertyStringFieldOptions {
  readonly annotationIndex: number;
  readonly committedValue: string;
  readonly dictionaryKey: 'Contents' | 'T' | 'Subj';
  readonly setAnnotationString: (
    annotationIndex: number,
    key: 'Contents' | 'T' | 'Subj',
    oldValue: string,
    newValue: string,
  ) => Promise<void>;
}

export interface AnnotationPropertyStringFieldResult<TElement extends HTMLInputElement | HTMLTextAreaElement> {
  readonly localValue: string;
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<TElement>) => void;
  readonly handleKeyDown: (event: ReactKeyboardEvent<TElement>) => void;
}
