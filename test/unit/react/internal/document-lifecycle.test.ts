import { describe, expect, test } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import {
  documentLifecycleReducer,
  INITIAL_DOCUMENT_LIFECYCLE_STATE,
} from '../../../../src/react/internal/document-lifecycle.js';

function createMockDocument(id: string): WorkerPDFiumDocument {
  return { id } as unknown as WorkerPDFiumDocument;
}

describe('documentLifecycleReducer', () => {
  test('enters password-required state with pending document request', () => {
    const next = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'passwordRequired',
      request: { data: new ArrayBuffer(8), name: 'secure.pdf' },
    });

    expect(next.document).toBeNull();
    expect(next.documentName).toBeNull();
    expect(next.password).toEqual({
      required: true,
      attempted: false,
      error: null,
    });
    expect(next.pendingDocument?.name).toBe('secure.pdf');
  });

  test('marks password flow as attempted before retrying openDocument', () => {
    const requiredState = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'passwordRequired',
      request: { data: new ArrayBuffer(8), name: 'secure.pdf' },
    });

    const next = documentLifecycleReducer(requiredState, { type: 'passwordSubmit' });

    expect(next.password).toEqual({
      required: true,
      attempted: true,
      error: null,
    });
    expect(next.pendingDocument?.name).toBe('secure.pdf');
  });

  test('records incorrect password errors while preserving pending request', () => {
    const requiredState = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'passwordRequired',
      request: { data: new ArrayBuffer(8), name: 'secure.pdf' },
    });

    const next = documentLifecycleReducer(requiredState, { type: 'passwordIncorrect' });

    expect(next.password).toEqual({
      required: true,
      attempted: true,
      error: 'Incorrect password',
    });
    expect(next.pendingDocument?.name).toBe('secure.pdf');
  });

  test('resets password state and pending request on successful load', () => {
    const requiredState = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'passwordRequired',
      request: { data: new ArrayBuffer(8), name: 'secure.pdf' },
    });
    const document = createMockDocument('doc-1');

    const next = documentLifecycleReducer(requiredState, { type: 'loadSuccess', document, name: 'loaded.pdf' });

    expect(next.document).toBe(document);
    expect(next.documentName).toBe('loaded.pdf');
    expect(next.password).toEqual({
      required: false,
      attempted: false,
      error: null,
    });
    expect(next.pendingDocument).toBeNull();
  });

  test('clears document and password flow state on hard reset', () => {
    const loadedState = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'loadSuccess',
      document: createMockDocument('doc-1'),
      name: 'a.pdf',
    });

    const next = documentLifecycleReducer(loadedState, { type: 'clearDocument' });

    expect(next).toEqual(INITIAL_DOCUMENT_LIFECYCLE_STATE);
  });

  test('cancels password prompt and clears pending password state', () => {
    const loadedState = documentLifecycleReducer(INITIAL_DOCUMENT_LIFECYCLE_STATE, {
      type: 'loadSuccess',
      document: createMockDocument('doc-1'),
      name: 'a.pdf',
    });
    const inPasswordFlow = documentLifecycleReducer(loadedState, {
      type: 'passwordRequired',
      request: { data: new ArrayBuffer(8), name: 'secure.pdf' },
    });

    const next = documentLifecycleReducer(inPasswordFlow, { type: 'passwordCancel' });

    expect(next.document).toBeNull();
    expect(next.documentName).toBeNull();
    expect(next.password).toEqual({
      required: false,
      attempted: false,
      error: null,
    });
    expect(next.pendingDocument).toBeNull();
  });
});
