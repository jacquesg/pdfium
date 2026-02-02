---
title: Worker Mode
description: Off-main-thread PDF processing with Web Workers
---

For browser applications, processing PDFs on the main thread can cause UI freezes. Worker mode moves PDF operations to a Web Worker, keeping the UI responsive.

## When to Use Workers

**Use workers when:**
- Rendering takes more than 16ms (drops below 60fps)
- Processing large or complex PDFs
- Handling multiple documents concurrently
- UI responsiveness is critical

**Use main thread when:**
- Processing is fast (small documents)
- Running in Node.js (no workers needed)
- Simplicity is preferred

## Setup Overview

1. Create a worker script
2. Load WASM binary
3. Create `WorkerProxy` instance
4. Use proxy methods for operations

## Worker Script

Create `pdfium-worker.ts`:

```typescript
import { PDFium, PDFiumDocument } from '@scaryterry/pdfium';

interface Message {
  id: string;
  type: string;
  payload: unknown;
}

let pdfium: PDFium;
const documents = new Map<string, PDFiumDocument>();
let documentCounter = 0;

self.onmessage = async (event: MessageEvent<Message>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'init': {
        const { wasmBinary } = payload as { wasmBinary: ArrayBuffer };
        pdfium = await PDFium.init({ wasmBinary });
        respond(id, 'init', { success: true });
        break;
      }

      case 'openDocument': {
        const { data, password } = payload as {
          data: ArrayBuffer;
          password?: string;
        };
        const document = await pdfium.openDocument(new Uint8Array(data), { password });
        const docId = `doc_${++documentCounter}`;
        documents.set(docId, document);
        respond(id, 'openDocument', {
          docId,
          pageCount: document.pageCount,
        });
        break;
      }

      case 'renderPage': {
        const { docId, pageIndex, options } = payload as {
          docId: string;
          pageIndex: number;
          options?: { scale?: number };
        };
        const document = documents.get(docId);
        if (!document) throw new Error('Document not found');

        using page = document.getPage(pageIndex);
        const result = page.render(options);

        // Transfer pixel data to main thread
        respond(id, 'renderPage', {
          data: result.data.buffer,
          width: result.width,
          height: result.height,
        }, [result.data.buffer]);
        break;
      }

      case 'getText': {
        const { docId, pageIndex } = payload as {
          docId: string;
          pageIndex: number;
        };
        const document = documents.get(docId);
        if (!document) throw new Error('Document not found');

        using page = document.getPage(pageIndex);
        const text = page.getText();
        respond(id, 'getText', { text });
        break;
      }

      case 'closeDocument': {
        const { docId } = payload as { docId: string };
        const document = documents.get(docId);
        if (document) {
          document.dispose();
          documents.delete(docId);
        }
        respond(id, 'closeDocument', { success: true });
        break;
      }

      case 'dispose': {
        for (const doc of documents.values()) {
          doc.dispose();
        }
        documents.clear();
        pdfium?.dispose();
        respond(id, 'dispose', { success: true });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    respond(id, type, {
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: (error as { code?: number }).code,
      },
    });
  }
};

function respond(id: string, type: string, data: unknown, transfer?: Transferable[]) {
  self.postMessage({ id, type, ...data }, { transfer: transfer || [] });
}
```

## Main Thread Client

Create a client wrapper:

```typescript
interface WorkerMessage {
  id: string;
  type: string;
  [key: string]: unknown;
}

class PDFWorkerClient {
  private worker: Worker;
  private pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private idCounter = 0;

  constructor(workerUrl: string) {
    this.worker = new Worker(workerUrl, { type: 'module' });

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, error, ...data } = event.data;
      const handler = this.pending.get(id);

      if (!handler) return;
      this.pending.delete(id);

      if (error) {
        handler.reject(new Error((error as { message: string }).message));
      } else {
        handler.resolve(data);
      }
    };
  }

  private send<T>(type: string, payload: unknown, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = String(++this.idCounter);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, type, payload }, { transfer: transfer || [] });
    });
  }

  async init(wasmBinary: ArrayBuffer): Promise<void> {
    await this.send('init', { wasmBinary }, [wasmBinary]);
  }

  async openDocument(
    data: ArrayBuffer,
    password?: string
  ): Promise<{ docId: string; pageCount: number }> {
    return this.send('openDocument', { data, password }, [data]);
  }

  async renderPage(
    docId: string,
    pageIndex: number,
    options?: { scale?: number }
  ): Promise<{ data: ArrayBuffer; width: number; height: number }> {
    return this.send('renderPage', { docId, pageIndex, options });
  }

  async getText(docId: string, pageIndex: number): Promise<{ text: string }> {
    return this.send('getText', { docId, pageIndex });
  }

  async closeDocument(docId: string): Promise<void> {
    await this.send('closeDocument', { docId });
  }

  async dispose(): Promise<void> {
    await this.send('dispose', {});
    this.worker.terminate();
  }
}
```

## Usage Example

```typescript
async function renderPDFInWorker() {
  // Load WASM
  const wasmResponse = await fetch('/pdfium.wasm');
  const wasmBinary = await wasmResponse.arrayBuffer();

  // Create worker client
  const client = new PDFWorkerClient('/pdfium-worker.js');
  await client.init(wasmBinary);

  try {
    // Load PDF
    const pdfResponse = await fetch('/document.pdf');
    const pdfData = await pdfResponse.arrayBuffer();
    const { docId, pageCount } = await client.openDocument(pdfData);

    console.log(`Loaded document with ${pageCount} pages`);

    // Render first page
    const { data, width, height } = await client.renderPage(docId, 0, { scale: 2 });

    // Display on canvas
    const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    const imageData = new ImageData(
      new Uint8ClampedArray(data),
      width,
      height
    );
    ctx.putImageData(imageData, 0, 0);

    // Cleanup
    await client.closeDocument(docId);
  } finally {
    await client.dispose();
  }
}
```

## Using WorkerProxy Class

The library provides a built-in `WorkerProxy` class:

```typescript
import { WorkerProxy } from '@scaryterry/pdfium';

async function useWorkerProxy() {
  const wasmBinary = await fetch('/pdfium.wasm').then(r => r.arrayBuffer());

  await using proxy = await WorkerProxy.create('/pdfium-worker.js', wasmBinary, {
    timeout: 30000,
  });

  const pdfData = await fetch('/document.pdf').then(r => r.arrayBuffer());
  using document = await proxy.openDocument(pdfData);

  const result = await proxy.renderPage(document.id, 0, { scale: 2 });

  // Use result...
}
```

## Bundler Configuration

### Vite

```typescript
// vite.config.ts
export default {
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
};
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: { loader: 'worker-loader' },
      },
    ],
  },
};
```

## Progress Reporting

Add progress callbacks for long operations:

```typescript
// Worker side
case 'renderPage': {
  const { docId, pageIndex, options } = payload;
  const document = documents.get(docId);

  // Report start
  self.postMessage({ id, type: 'progress', stage: 'loading' });

  using page = document.getPage(pageIndex);

  self.postMessage({ id, type: 'progress', stage: 'rendering' });

  const result = page.render(options);

  self.postMessage({ id, type: 'progress', stage: 'transferring' });

  respond(id, 'renderPage', {
    data: result.data.buffer,
    width: result.width,
    height: result.height,
  }, [result.data.buffer]);
  break;
}
```

```typescript
// Main thread
worker.onmessage = (event) => {
  const { id, type } = event.data;

  if (type === 'progress') {
    console.log(`Progress: ${event.data.stage}`);
    return;
  }

  // Handle response...
};
```

## Error Handling

```typescript
class PDFWorkerClient {
  // ...

  private send<T>(type: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = String(++this.idCounter);

      // Add timeout
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Operation ${type} timed out`));
      }, 30000);

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.worker.postMessage({ id, type, payload });
    });
  }
}
```

## Multiple Workers

For parallel processing:

```typescript
class WorkerPool {
  private workers: PDFWorkerClient[] = [];
  private available: PDFWorkerClient[] = [];
  private queue: Array<{
    task: (worker: PDFWorkerClient) => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];

  async init(workerUrl: string, wasmBinary: ArrayBuffer, poolSize = 4) {
    for (let i = 0; i < poolSize; i++) {
      const binaryCopy = wasmBinary.slice(0);
      const worker = new PDFWorkerClient(workerUrl);
      await worker.init(binaryCopy);
      this.workers.push(worker);
      this.available.push(worker);
    }
  }

  async execute<T>(task: (worker: PDFWorkerClient) => Promise<T>): Promise<T> {
    if (this.available.length > 0) {
      const worker = this.available.pop()!;
      try {
        return await task(worker);
      } finally {
        this.available.push(worker);
        this.processQueue();
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve: resolve as (v: unknown) => void, reject });
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.available.length > 0) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.execute(task).then(resolve).catch(reject);
    }
  }

  async dispose() {
    for (const worker of this.workers) {
      await worker.dispose();
    }
  }
}

// Usage
const pool = new WorkerPool();
await pool.init('/worker.js', wasmBinary, navigator.hardwareConcurrency);

// Process PDFs in parallel
const results = await Promise.all(
  pdfUrls.map(url =>
    pool.execute(async (worker) => {
      const data = await fetch(url).then(r => r.arrayBuffer());
      const { docId, pageCount } = await worker.openDocument(data);
      // Process...
      await worker.closeDocument(docId);
      return result;
    })
  )
);
```

## Best Practices

1. **Minimise data transfer**: Transfer only what's needed
2. **Use transferable objects**: Use `transfer` option for ArrayBuffers
3. **Pool workers**: Reuse workers instead of creating new ones
4. **Handle errors**: Always catch and report worker errors
5. **Clean up**: Dispose workers when done

## See Also

- [WorkerProxy](/pdfium/api/classes/worker-proxy/) — Built-in worker proxy class
- [Browser Examples](/pdfium/examples/browser/) — Browser usage examples
- [Performance](/pdfium/concepts/performance/) — Optimisation tips
