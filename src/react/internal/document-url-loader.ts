interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

interface FetchRequestInitLike {
  signal?: AbortSignal;
}

type FetchLike = (input: string, init?: FetchRequestInitLike) => Promise<FetchResponseLike>;

interface LoadDocumentArrayBufferFromUrlOptions {
  url: string;
  baseHref?: string;
  fetchFn: FetchLike;
  signal?: AbortSignal;
}

function resolveHttpDocumentUrl(url: string, baseHref?: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url, baseHref);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  return parsed.href;
}

async function fetchDocumentArrayBuffer(url: string, fetchFn: FetchLike, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = signal ? await fetchFn(url, { signal }) : await fetchFn(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

async function loadDocumentArrayBufferFromUrl({
  url,
  baseHref,
  fetchFn,
  signal,
}: LoadDocumentArrayBufferFromUrlOptions): Promise<ArrayBuffer> {
  const resolvedUrl = resolveHttpDocumentUrl(url, baseHref);
  return fetchDocumentArrayBuffer(resolvedUrl, fetchFn, signal);
}

export { fetchDocumentArrayBuffer, loadDocumentArrayBufferFromUrl, resolveHttpDocumentUrl };
export type { FetchLike, FetchRequestInitLike, FetchResponseLike, LoadDocumentArrayBufferFromUrlOptions };
