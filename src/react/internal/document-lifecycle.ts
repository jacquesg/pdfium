'use client';

import type { WorkerPDFiumDocument } from '../../context/worker-client.js';

interface PendingDocumentRequest {
  data: ArrayBuffer | Uint8Array;
  name: string;
}

interface PasswordFlowState {
  required: boolean;
  attempted: boolean;
  error: string | null;
}

interface DocumentLifecycleState {
  document: WorkerPDFiumDocument | null;
  documentName: string | null;
  password: PasswordFlowState;
  pendingDocument: PendingDocumentRequest | null;
}

type DocumentLifecycleAction =
  | { type: 'loadSuccess'; document: WorkerPDFiumDocument; name: string }
  | { type: 'clearDocument' }
  | { type: 'passwordRequired'; request: PendingDocumentRequest }
  | { type: 'passwordSubmit' }
  | { type: 'passwordIncorrect' }
  | { type: 'passwordCancel' };

const IDLE_PASSWORD: PasswordFlowState = {
  required: false,
  attempted: false,
  error: null,
};

const INITIAL_DOCUMENT_LIFECYCLE_STATE: DocumentLifecycleState = {
  document: null,
  documentName: null,
  password: IDLE_PASSWORD,
  pendingDocument: null,
};

function documentLifecycleReducer(
  state: DocumentLifecycleState,
  action: DocumentLifecycleAction,
): DocumentLifecycleState {
  switch (action.type) {
    case 'loadSuccess':
      return {
        document: action.document,
        documentName: action.name,
        password: IDLE_PASSWORD,
        pendingDocument: null,
      };
    case 'clearDocument':
      return {
        document: null,
        documentName: null,
        password: IDLE_PASSWORD,
        pendingDocument: null,
      };
    case 'passwordRequired':
      return {
        document: null,
        documentName: null,
        password: {
          required: true,
          attempted: false,
          error: null,
        },
        pendingDocument: action.request,
      };
    case 'passwordSubmit':
      if (!state.pendingDocument) {
        return state;
      }
      return {
        ...state,
        password: {
          required: true,
          attempted: true,
          error: null,
        },
      };
    case 'passwordIncorrect':
      if (!state.pendingDocument) {
        return state;
      }
      return {
        document: null,
        documentName: null,
        password: {
          required: true,
          attempted: true,
          error: 'Incorrect password',
        },
        pendingDocument: state.pendingDocument,
      };
    case 'passwordCancel':
      return {
        ...state,
        password: IDLE_PASSWORD,
        pendingDocument: null,
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export { INITIAL_DOCUMENT_LIFECYCLE_STATE, documentLifecycleReducer };
export type { DocumentLifecycleAction, DocumentLifecycleState, PasswordFlowState, PendingDocumentRequest };
