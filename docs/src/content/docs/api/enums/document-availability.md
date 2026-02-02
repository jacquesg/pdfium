---
title: DocumentAvailability
description: Data availability states for progressive loading
---

Indicates the availability status of document data during progressive loading.

## Import

```typescript
import { DocumentAvailability } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `DataError` | -1 | Error occurred checking availability |
| `DataNotAvailable` | 0 | Required data not yet available |
| `DataAvailable` | 1 | Required data is available |
| `LinearisationUnknown` | 2 | Linearisation status unknown |

## Usage

```typescript
import { DocumentAvailability } from '@scaryterry/pdfium';

const progress = loader.checkProgress();

switch (progress) {
  case DocumentAvailability.DataAvailable:
    console.log('Document is ready');
    using document = loader.getDocument();
    break;

  case DocumentAvailability.DataNotAvailable:
    console.log('Need more data');
    // Feed more chunks...
    break;

  case DocumentAvailability.DataError:
    console.error('Error loading document');
    break;

  case DocumentAvailability.LinearisationUnknown:
    console.log('Linearisation status not yet determined');
    break;
}
```

## Progressive Loading Flow

```typescript
using loader = pdfium.createProgressiveLoader(initialChunk);

while (true) {
  const status = loader.checkProgress();

  if (status === DocumentAvailability.DataAvailable) {
    // Ready to use
    break;
  }

  if (status === DocumentAvailability.DataError) {
    throw new Error('Failed to load document');
  }

  // Feed more data
  const nextChunk = await fetchNextChunk();
  loader.feedData(nextChunk);
}

using document = loader.getDocument();
```

## See Also

- [ProgressivePDFLoader](/pdfium/api/classes/progressive-pdf-loader/) — Progressive loading class
- [LinearisationStatus](/pdfium/api/enums/linearisation-status/) — Linearisation detection
- [Progressive Loading Guide](/pdfium/guides/progressive-loading/) — Usage guide
