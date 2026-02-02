---
title: LinearisationStatus
description: PDF linearisation detection status
---

Indicates whether a PDF is linearised (web-optimised).

## Import

```typescript
import { LinearisationStatus } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `NotLinearised` | 0 | PDF is not linearised |
| `Linearised` | 1 | PDF is linearised |
| `Unknown` | -1 | Status cannot be determined |

## What is Linearisation?

Linearised PDFs (also called "web-optimised" or "fast web view" PDFs):

- Have the first page's resources at the beginning
- Include a hint table for efficient random access
- Allow displaying content before full download
- Are optimised for streaming over HTTP

## Usage

```typescript
import { LinearisationStatus } from '@scaryterry/pdfium';

using loader = pdfium.createProgressiveLoader(data);

if (loader.isLinearised) {
  console.log('PDF is linearised - can show first page early');
} else {
  console.log('PDF is not linearised - need full download');
}
```

## Checking Status

```typescript
function describeLinearisation(loader: ProgressivePDFLoader): string {
  // The loader exposes a boolean, but internally uses the enum
  if (loader.isLinearised) {
    return 'Linearised (web-optimised)';
  }
  return 'Not linearised (standard)';
}
```

## Progressive Loading Strategy

```typescript
async function loadPDF(url: string) {
  const response = await fetch(url);
  const reader = response.body!.getReader();

  // Read first chunk
  const { value: firstChunk } = await reader.read();
  using loader = pdfium.createProgressiveLoader(firstChunk!);

  if (loader.isLinearised) {
    // Can potentially show first page early
    console.log('Optimised for streaming');

    // Try to get document as data arrives
    while (!loader.isComplete) {
      const { value, done } = await reader.read();
      if (done) break;
      loader.feedData(value);

      // Attempt to render first page as soon as possible
      try {
        using document = loader.getDocument();
        using page = document.getPage(0);
        // Render...
        break; // Got first page
      } catch {
        // Need more data
      }
    }
  } else {
    // Non-linearised: need full download
    console.log('Downloading full file');

    const chunks: Uint8Array[] = [firstChunk!];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      loader.feedData(value);
    }
  }

  return loader.getDocument();
}
```

## See Also

- [ProgressivePDFLoader](/pdfium/api/classes/progressive-pdf-loader/) — Progressive loading class
- [DocumentAvailability](/pdfium/api/enums/document-availability/) — Data availability states
- [Progressive Loading Guide](/pdfium/guides/progressive-loading/) — Usage guide
