---
title: PageRotation
description: Page rotation values
---

Specifies the rotation of a PDF page.

## Import

```typescript
import { PageRotation } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Degrees | Description |
|--------|-------|---------|-------------|
| `None` | 0 | 0° | No rotation |
| `Clockwise90` | 1 | 90° | Rotated 90° clockwise |
| `Rotate180` | 2 | 180° | Rotated 180° |
| `CounterClockwise90` | 3 | 270° | Rotated 90° counter-clockwise |

## Usage

### Reading Page Rotation

```typescript
using page = document.getPage(0);

switch (page.rotation) {
  case PageRotation.None:
    console.log('Page is not rotated');
    break;
  case PageRotation.Clockwise90:
    console.log('Page is rotated 90° clockwise');
    break;
  case PageRotation.Rotate180:
    console.log('Page is rotated 180°');
    break;
  case PageRotation.CounterClockwise90:
    console.log('Page is rotated 90° counter-clockwise');
    break;
}
```

### Rendering with Rotation

```typescript
// Apply additional rotation during rendering
const result = page.render({
  scale: 2,
  rotation: PageRotation.Clockwise90,
});
```

### Convert to Degrees

```typescript
function rotationToDegrees(rotation: PageRotation): number {
  const degrees: Record<PageRotation, number> = {
    [PageRotation.None]: 0,
    [PageRotation.Clockwise90]: 90,
    [PageRotation.Rotate180]: 180,
    [PageRotation.CounterClockwise90]: 270,
  };
  return degrees[rotation];
}

const degrees = rotationToDegrees(page.rotation);
console.log(`Page is rotated ${degrees}°`);
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Page rotation property
- [Render PDF Guide](/pdfium/guides/render-pdf/) — Rendering with rotation
