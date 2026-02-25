---
title: React
description: React viewer documentation for usage, customization, architecture, and contributor standards.
---

# React

**Scope:** React viewer toolkit (`@scaryterry/pdfium/react`).

Use this page to get from zero to a working viewer, then choose your customization depth.

`@scaryterry/pdfium/react` provides a composable viewer stack with three layers:

- `PDFViewer` for high-level integration.
- `useViewerSetup` + slot components for custom layout control.
- Low-level hooks/components for full headless composition.

## What You Need Before Coding

- A valid PDF source (`ArrayBuffer` or URL/fetch flow in your app).
- A worker entry module in your app bundle.
- A WASM source (`wasmUrl` or `wasmBinary`).

## Setup: WASM + Worker Assets

`PDFiumProvider` requires:

- `workerUrl` (URL to a module worker entry)
- One of `wasmUrl` or `wasmBinary`
- Optional `initialDocument`

### Recommended (bundler-managed worker module)

#### Worker Entry Snippet (Canonical)

Create a worker entry in your app:

```ts
// src/pdfium.worker.ts
import '@scaryterry/pdfium/worker';
```

#### Provider Bootstrap Snippet (Canonical)

Then wire the provider:

```tsx
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'document.pdf' }}
    >
      <PDFViewer />
    </PDFiumProvider>
  );
}
```

### If you serve assets from `public/`

- Copy `node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm` to `public/pdfium.wasm`
- Keep the worker as a bundled module (`src/pdfium.worker.ts`) and pass its emitted URL as `workerUrl`

Do not copy only `dist/worker.js` by itself; it imports sibling modules.

## Verify

Your baseline React setup is correct when:

- `PDFiumProvider` mounts without init errors.
- `PDFViewer` shows at least page 1 of your document.
- No worker timeout or WASM load errors appear in the console.

## Usage

- [PDFViewer](./pdf-viewer.md) — Compound viewer component and state surface.
- [Toolbar](./toolbar.md) — `DefaultToolbar` and headless `PDFToolbar` slot API.
- [useViewerSetup](./use-viewer-setup.md) — Orchestration hook for navigation/zoom/layout.
- [Examples](./examples.md) — End-to-end integration recipes.
- [Styling](./styling.md) — Theming and visual customization.

## Engineering

- [Architecture](./architecture.md) — Layer boundaries and design rules.
- [Architecture Map](./architecture-index.md) — Module-to-layer mapping.
- [Testing](./testing.md) — React test strategy and race coverage standards.
- [Contributor Playbook](./contributor-playbook.md) — Required file shapes and merge checks.
