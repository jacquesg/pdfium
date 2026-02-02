/**
 * Form fill WASM bindings.
 *
 * @module wasm/bindings/form
 */

import type { AnnotationHandle, DocumentHandle, FormHandle, PageHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Form fill WASM bindings.
 */
export interface FormBindings {
  // Form fill initialisation
  _FPDFDOC_InitFormFillEnvironment: (document: DocumentHandle, formInfo: WASMPointer) => FormHandle;
  _FPDFDOC_ExitFormFillEnvironment: (formHandle: FormHandle) => void;
  _FORM_OnAfterLoadPage: (page: PageHandle, formHandle: FormHandle) => void;
  _FORM_OnBeforeClosePage: (page: PageHandle, formHandle: FormHandle) => void;

  // Extended form operations
  _FORM_GetFocusedAnnot: (form: FormHandle, pageIndex: WASMPointer, annot: WASMPointer) => number;
  _FORM_GetSelectedText: (form: FormHandle, page: PageHandle, buffer: WASMPointer, length: number) => number;
  _FORM_ReplaceSelection: (form: FormHandle, page: PageHandle, text: WASMPointer) => void;
  _FORM_CanUndo: (form: FormHandle, page: PageHandle) => number;
  _FORM_CanRedo: (form: FormHandle, page: PageHandle) => number;
  _FORM_Undo: (form: FormHandle, page: PageHandle) => number;
  _FORM_Redo: (form: FormHandle, page: PageHandle) => number;
  _FORM_ForceToKillFocus: (form: FormHandle) => number;
  _FPDFPage_HasFormFieldAtPoint: (form: FormHandle, page: PageHandle, x: number, y: number) => number;
  _FPDFPage_FormFieldZOrderAtPoint: (form: FormHandle, page: PageHandle, x: number, y: number) => number;
  _FPDF_GetFormType: (document: DocumentHandle) => number;
  _FPDF_SetFormFieldHighlightColor: (form: FormHandle, fieldType: number, color: number) => void;
  _FPDF_SetFormFieldHighlightAlpha: (form: FormHandle, alpha: number) => void;

  // Form interaction operations
  _FORM_OnMouseMove: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnMouseWheel: (
    form: FormHandle,
    page: PageHandle,
    modifier: number,
    coord: WASMPointer,
    deltaX: number,
    deltaY: number,
  ) => number;
  _FORM_OnFocus: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnLButtonDown: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnRButtonDown: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnLButtonUp: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnRButtonUp: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnLButtonDoubleClick: (form: FormHandle, page: PageHandle, modifier: number, x: number, y: number) => number;
  _FORM_OnKeyDown: (form: FormHandle, page: PageHandle, keyCode: number, modifier: number) => number;
  _FORM_OnKeyUp: (form: FormHandle, page: PageHandle, keyCode: number, modifier: number) => number;
  _FORM_OnChar: (form: FormHandle, page: PageHandle, charCode: number, modifier: number) => number;
  _FORM_GetFocusedText: (form: FormHandle, page: PageHandle, buffer: WASMPointer, length: number) => number;
  _FORM_ReplaceAndKeepSelection: (form: FormHandle, page: PageHandle, text: WASMPointer) => void;
  _FORM_SelectAllText: (form: FormHandle, page: PageHandle) => number;
  _FORM_SetFocusedAnnot: (form: FormHandle, annot: AnnotationHandle) => number;
  _FORM_SetIndexSelected: (form: FormHandle, page: PageHandle, index: number, selected: number) => number;
  _FORM_IsIndexSelected: (form: FormHandle, page: PageHandle, index: number) => number;

  // Form action execution
  _FORM_DoDocumentAAction: (form: FormHandle, actionType: number) => void;
  _FORM_DoDocumentJSAction: (form: FormHandle) => void;
  _FORM_DoDocumentOpenAction: (form: FormHandle) => void;
  _FORM_DoPageAAction: (page: PageHandle, form: FormHandle, actionType: number) => void;
}
