import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AnnotationPropertyStringFieldOptions,
  AnnotationPropertyStringFieldResult,
} from './annotation-property-text-field.types.js';

export function useAnnotationPropertyStringField<TElement extends HTMLInputElement | HTMLTextAreaElement>({
  annotationIndex,
  committedValue,
  dictionaryKey,
  setAnnotationString,
}: AnnotationPropertyStringFieldOptions): AnnotationPropertyStringFieldResult<TElement> {
  const [localValue, setLocalValue] = useState(committedValue);
  const skipCommitOnBlurRef = useRef(false);

  useEffect(() => {
    setLocalValue(committedValue);
  }, [committedValue]);

  const handleChange = useCallback((event: ChangeEvent<TElement>) => {
    setLocalValue(event.currentTarget.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<TElement>) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      skipCommitOnBlurRef.current = true;
      setLocalValue(committedValue);
      event.currentTarget.blur();
    },
    [committedValue],
  );

  const handleBlur = useCallback(() => {
    if (skipCommitOnBlurRef.current) {
      skipCommitOnBlurRef.current = false;
      return;
    }
    if (localValue !== committedValue) {
      void setAnnotationString(annotationIndex, dictionaryKey, committedValue, localValue);
    }
  }, [annotationIndex, committedValue, dictionaryKey, localValue, setAnnotationString]);

  return {
    handleBlur,
    handleChange,
    handleKeyDown,
    localValue,
  };
}
