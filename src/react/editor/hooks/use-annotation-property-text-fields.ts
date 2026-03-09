import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import { useAnnotationPropertyStringField } from './use-annotation-property-string-field.js';

export interface AnnotationPropertyTextFieldsResult {
  readonly handleAuthorBlur: () => void;
  readonly handleAuthorChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleAuthorKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  readonly handleContentsBlur: () => void;
  readonly handleContentsChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleContentsKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  readonly handleSubjectBlur: () => void;
  readonly handleSubjectChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSubjectKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  readonly localAuthor: string;
  readonly localContents: string;
  readonly localSubject: string;
}

interface UseAnnotationPropertyTextFieldsOptions {
  readonly annotation: SerialisedAnnotation;
  readonly crud: AnnotationCrudActions;
}

export function useAnnotationPropertyTextFields({
  annotation,
  crud,
}: UseAnnotationPropertyTextFieldsOptions): AnnotationPropertyTextFieldsResult {
  const contentsField = useAnnotationPropertyStringField<HTMLTextAreaElement>({
    annotationIndex: annotation.index,
    committedValue: annotation.contents,
    dictionaryKey: 'Contents',
    setAnnotationString: crud.setAnnotationString,
  });
  const authorField = useAnnotationPropertyStringField<HTMLInputElement>({
    annotationIndex: annotation.index,
    committedValue: annotation.author,
    dictionaryKey: 'T',
    setAnnotationString: crud.setAnnotationString,
  });
  const subjectField = useAnnotationPropertyStringField<HTMLInputElement>({
    annotationIndex: annotation.index,
    committedValue: annotation.subject,
    dictionaryKey: 'Subj',
    setAnnotationString: crud.setAnnotationString,
  });

  return {
    handleAuthorBlur: authorField.handleBlur,
    handleAuthorChange: authorField.handleChange as (event: ChangeEvent<HTMLInputElement>) => void,
    handleAuthorKeyDown: authorField.handleKeyDown as (event: ReactKeyboardEvent<HTMLInputElement>) => void,
    handleContentsBlur: contentsField.handleBlur,
    handleContentsChange: contentsField.handleChange as (event: ChangeEvent<HTMLTextAreaElement>) => void,
    handleContentsKeyDown: contentsField.handleKeyDown as (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void,
    handleSubjectBlur: subjectField.handleBlur,
    handleSubjectChange: subjectField.handleChange as (event: ChangeEvent<HTMLInputElement>) => void,
    handleSubjectKeyDown: subjectField.handleKeyDown as (event: ReactKeyboardEvent<HTMLInputElement>) => void,
    localAuthor: authorField.localValue,
    localContents: contentsField.localValue,
    localSubject: subjectField.localValue,
  };
}
