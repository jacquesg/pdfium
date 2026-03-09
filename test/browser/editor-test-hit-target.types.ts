export type EditorAnnotationHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end';

export type SelectionAnnotationHandle = Exclude<EditorAnnotationHandle, 'start' | 'end'>;

export interface LineEndpoints {
  readonly start: { x: number; y: number };
  readonly end: { x: number; y: number };
}
