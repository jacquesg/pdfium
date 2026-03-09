import type { ReactNode } from 'react';
import type { AnnotationPropertyTextFieldsResult } from '../hooks/use-annotation-property-text-fields.js';
import { AnnotationPropertyPanelTextInput } from './annotation-property-panel-text-input.js';
import { AnnotationPropertyPanelTextarea } from './annotation-property-panel-textarea.js';

type AnnotationPropertyPanelTextSectionProps = Pick<
  AnnotationPropertyTextFieldsResult,
  | 'handleAuthorBlur'
  | 'handleAuthorChange'
  | 'handleAuthorKeyDown'
  | 'handleContentsBlur'
  | 'handleContentsChange'
  | 'handleContentsKeyDown'
  | 'handleSubjectBlur'
  | 'handleSubjectChange'
  | 'handleSubjectKeyDown'
  | 'localAuthor'
  | 'localContents'
  | 'localSubject'
>;

export function AnnotationPropertyPanelTextSection({
  handleAuthorBlur,
  handleAuthorChange,
  handleAuthorKeyDown,
  handleContentsBlur,
  handleContentsChange,
  handleContentsKeyDown,
  handleSubjectBlur,
  handleSubjectChange,
  handleSubjectKeyDown,
  localAuthor,
  localContents,
  localSubject,
}: AnnotationPropertyPanelTextSectionProps): ReactNode {
  return (
    <>
      <AnnotationPropertyPanelTextarea
        label="Contents"
        testId="contents-input"
        value={localContents}
        onChange={handleContentsChange}
        onKeyDown={handleContentsKeyDown}
        onBlur={handleContentsBlur}
      />

      <AnnotationPropertyPanelTextInput
        label="Author"
        testId="author-input"
        value={localAuthor}
        onChange={handleAuthorChange}
        onKeyDown={handleAuthorKeyDown}
        onBlur={handleAuthorBlur}
      />

      <AnnotationPropertyPanelTextInput
        label="Subject"
        testId="subject-input"
        value={localSubject}
        onChange={handleSubjectChange}
        onKeyDown={handleSubjectKeyDown}
        onBlur={handleSubjectBlur}
      />
    </>
  );
}
