import { describe, expect, it, vi } from 'vitest';
import {
  fetchDocumentArrayBuffer,
  loadDocumentArrayBufferFromUrl,
  resolveHttpDocumentUrl,
} from '../../../../src/react/internal/document-url-loader.js';

describe('resolveHttpDocumentUrl', () => {
  it('accepts absolute https URLs', () => {
    expect(resolveHttpDocumentUrl('https://example.com/docs/a.pdf')).toBe('https://example.com/docs/a.pdf');
  });

  it('resolves relative URLs against base href', () => {
    expect(resolveHttpDocumentUrl('./a.pdf', 'https://example.com/docs/index.html')).toBe(
      'https://example.com/docs/a.pdf',
    );
  });

  it('rejects unsupported schemes', () => {
    expect(() => resolveHttpDocumentUrl('javascript:alert(1)')).toThrow('Unsupported URL protocol: javascript:');
  });

  it('throws a readable error for invalid URLs', () => {
    expect(() => resolveHttpDocumentUrl('/a.pdf')).toThrow('Invalid URL: /a.pdf');
  });
});

describe('fetchDocumentArrayBuffer', () => {
  it('returns the fetched buffer for successful responses', async () => {
    const buffer = new ArrayBuffer(16);
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => buffer,
    }));

    await expect(fetchDocumentArrayBuffer('https://example.com/a.pdf', fetchFn)).resolves.toBe(buffer);
    expect(fetchFn).toHaveBeenCalledWith('https://example.com/a.pdf');
  });

  it('throws with status details for non-ok responses', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      arrayBuffer: async () => new ArrayBuffer(0),
    }));

    await expect(fetchDocumentArrayBuffer('https://example.com/missing.pdf', fetchFn)).rejects.toThrow(
      'HTTP 404: Not Found',
    );
  });

  it('forwards abort signal to fetch implementation', async () => {
    const signal = new AbortController().signal;
    const buffer = new ArrayBuffer(4);
    const fetchFn = vi.fn(async (_input: string, init?: { signal?: AbortSignal }) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => buffer,
      seenSignal: init?.signal,
    }));

    await fetchDocumentArrayBuffer('https://example.com/a.pdf', fetchFn, signal);

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/a.pdf', { signal });
  });
});

describe('loadDocumentArrayBufferFromUrl', () => {
  it('resolves, fetches, and returns the document buffer', async () => {
    const buffer = new ArrayBuffer(8);
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => buffer,
    }));

    await expect(
      loadDocumentArrayBufferFromUrl({
        url: '../a.pdf',
        baseHref: 'https://example.com/docs/nested/index.html',
        fetchFn,
      }),
    ).resolves.toBe(buffer);

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/docs/a.pdf');
  });

  it('passes abort signal through to fetch loader', async () => {
    const signal = new AbortController().signal;
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => new ArrayBuffer(1),
    }));

    await loadDocumentArrayBufferFromUrl({
      url: '/a.pdf',
      baseHref: 'https://example.com',
      fetchFn,
      signal,
    });

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/a.pdf', { signal });
  });
});
