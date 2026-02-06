---
title: Character Positioning
description: Getting character bounding boxes and positions in PDF text
---

This guide covers character-level text positioning using `getCharBox()` and `getCharIndexAtPos()` for precise text coordinate mapping.

## Use Cases

Character positioning is useful for:

- **Text highlighting** — Drawing highlights at exact character positions
- **Text selection** — Mapping mouse coordinates to text
- **Accessibility** — Providing character-level navigation
- **Text overlay** — Positioning elements relative to specific characters
- **PDF redaction** — Identifying exact regions to redact

## Prerequisites

- Familiarity with [Extract Text](/pdfium/guides/extract-text/)
- Understanding of [Coordinate Systems](/pdfium/concepts/coordinates/)

## Getting Character Bounds

Use `getCharBox()` to get the bounding box of a character at a specific index:

```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(pdfData);
using page = document.getPage(0);

// Get bounds of the first character (index 0)
const charBox = page.getCharBox(0);

if (charBox) {
  console.log(`Character bounds:`);
  console.log(`  Left: ${charBox.left}`);
  console.log(`  Right: ${charBox.right}`);
  console.log(`  Top: ${charBox.top}`);
  console.log(`  Bottom: ${charBox.bottom}`);
}
```

### CharBox Interface

```typescript
interface CharBox {
  left: number;    // Left edge in page coordinates
  right: number;   // Right edge in page coordinates
  top: number;     // Top edge in page coordinates
  bottom: number;  // Bottom edge in page coordinates
}
```

### Return Value

- Returns `CharBox` if the character index is valid
- Returns `undefined` if the index is out of range

## Finding Character at Position

Use `getCharIndexAtPos()` to find which character is at a given coordinate:

```typescript
// Find character at position (100, 700) with 10-point tolerance
const charIndex = page.getCharIndexAtPos(100, 700, 10, 10);

if (charIndex >= 0) {
  console.log(`Character at position: index ${charIndex}`);
} else if (charIndex === -1) {
  console.log('No character at this position');
} else if (charIndex === -3) {
  console.log('Position is outside the page');
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `x` | `number` | — | X position in page coordinates |
| `y` | `number` | — | Y position in page coordinates |
| `xTolerance` | `number` | 10 | Horizontal search tolerance in points |
| `yTolerance` | `number` | 10 | Vertical search tolerance in points |

### Return Values

| Value | Meaning |
|-------|---------|
| `>= 0` | Character index at the position |
| `-1` | No character found within tolerance |
| `-3` | Position is outside the page bounds |

## Common Patterns

### Get All Character Positions

```typescript
function getAllCharacterPositions(page: PDFiumPage): CharBox[] {
  const text = page.getText();
  const positions: CharBox[] = [];

  for (let i = 0; i < text.length; i++) {
    const box = page.getCharBox(i);
    if (box) {
      positions.push(box);
    }
  }

  return positions;
}

const positions = getAllCharacterPositions(page);
console.log(`Found ${positions.length} character positions`);
```

### Calculate Text Bounds

```typescript
function getTextBounds(page: PDFiumPage, startIndex: number, endIndex: number) {
  let minLeft = Infinity;
  let minBottom = Infinity;
  let maxRight = -Infinity;
  let maxTop = -Infinity;

  for (let i = startIndex; i < endIndex; i++) {
    const box = page.getCharBox(i);
    if (box) {
      minLeft = Math.min(minLeft, box.left);
      minBottom = Math.min(minBottom, box.bottom);
      maxRight = Math.max(maxRight, box.right);
      maxTop = Math.max(maxTop, box.top);
    }
  }

  if (minLeft === Infinity) {
    return undefined;
  }

  return {
    left: minLeft,
    bottom: minBottom,
    right: maxRight,
    top: maxTop,
  };
}

// Get bounds of characters 0-10
const bounds = getTextBounds(page, 0, 10);
if (bounds) {
  console.log(`Text spans from (${bounds.left}, ${bounds.bottom}) to (${bounds.right}, ${bounds.top})`);
}
```

### Map Click to Character

```typescript
function mapClickToCharacter(
  page: PDFiumPage,
  clickX: number,
  clickY: number,
): { index: number; char: string } | undefined {
  const index = page.getCharIndexAtPos(clickX, clickY, 5, 5);

  if (index < 0) {
    return undefined;
  }

  const text = page.getText();
  const char = text[index];

  return char ? { index, char } : undefined;
}

// Simulate a click at (200, 650)
const result = mapClickToCharacter(page, 200, 650);
if (result) {
  console.log(`Clicked on character '${result.char}' at index ${result.index}`);
}
```

### Highlight Word

```typescript
function getWordBoundsAtIndex(
  page: PDFiumPage,
  charIndex: number,
): { word: string; bounds: CharBox } | undefined {
  const text = page.getText();

  // Find word boundaries
  let start = charIndex;
  let end = charIndex;

  // Scan backwards to word start
  while (start > 0 && /\w/.test(text[start - 1] ?? '')) {
    start--;
  }

  // Scan forwards to word end
  while (end < text.length && /\w/.test(text[end] ?? '')) {
    end++;
  }

  if (start === end) {
    return undefined;
  }

  const word = text.substring(start, end);

  // Calculate combined bounds
  let minLeft = Infinity;
  let minBottom = Infinity;
  let maxRight = -Infinity;
  let maxTop = -Infinity;

  for (let i = start; i < end; i++) {
    const box = page.getCharBox(i);
    if (box) {
      minLeft = Math.min(minLeft, box.left);
      minBottom = Math.min(minBottom, box.bottom);
      maxRight = Math.max(maxRight, box.right);
      maxTop = Math.max(maxTop, box.top);
    }
  }

  return {
    word,
    bounds: {
      left: minLeft,
      right: maxRight,
      top: maxTop,
      bottom: minBottom,
    },
  };
}
```

### Text Selection Rectangles

```typescript
interface SelectionRect {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

function getSelectionRects(
  page: PDFiumPage,
  startIndex: number,
  endIndex: number,
): SelectionRect[] {
  const rects: SelectionRect[] = [];
  let currentRect: SelectionRect | undefined;
  let lastTop: number | undefined;

  for (let i = startIndex; i < endIndex; i++) {
    const box = page.getCharBox(i);
    if (!box) continue;

    // Check if we're on a new line (different Y position)
    const isNewLine = lastTop !== undefined && Math.abs(box.top - lastTop) > 2;

    if (isNewLine && currentRect) {
      rects.push(currentRect);
      currentRect = undefined;
    }

    if (!currentRect) {
      currentRect = {
        left: box.left,
        bottom: box.bottom,
        width: box.right - box.left,
        height: box.top - box.bottom,
      };
    } else {
      // Extend current rectangle
      currentRect.width = box.right - currentRect.left;
      currentRect.bottom = Math.min(currentRect.bottom, box.bottom);
      currentRect.height = Math.max(box.top, currentRect.bottom + currentRect.height) - currentRect.bottom;
    }

    lastTop = box.top;
  }

  if (currentRect) {
    rects.push(currentRect);
  }

  return rects;
}

// Get selection rectangles for characters 0-50
const selectionRects = getSelectionRects(page, 0, 50);
console.log(`Selection spans ${selectionRects.length} line(s)`);
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function demonstrateCharacterPositioning(filePath: string) {
  const pdfData = await fs.readFile(filePath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfData);
  using page = document.getPage(0);

  const text = page.getText();
  console.log(`Page text length: ${text.length} characters\n`);

  // Display first 10 character positions
  console.log('First 10 character positions:');
  for (let i = 0; i < Math.min(10, text.length); i++) {
    const box = page.getCharBox(i);
    const char = text[i];

    if (box && char) {
      const displayChar = char === '\n' ? '\\n' : char === ' ' ? '␣' : char;
      console.log(
        `  [${i}] '${displayChar}' at (${box.left.toFixed(1)}, ${box.bottom.toFixed(1)}) - ` +
        `(${box.right.toFixed(1)}, ${box.top.toFixed(1)})`
      );
    }
  }

  // Find character at centre of page
  const centreX = page.width / 2;
  const centreY = page.height / 2;

  console.log(`\nCharacter at page centre (${centreX}, ${centreY}):`);
  const centreIndex = page.getCharIndexAtPos(centreX, centreY, 20, 20);

  if (centreIndex >= 0) {
    const box = page.getCharBox(centreIndex);
    const char = text[centreIndex];
    console.log(`  Found '${char}' at index ${centreIndex}`);
    if (box) {
      console.log(`  Bounds: (${box.left.toFixed(1)}, ${box.bottom.toFixed(1)}) - ` +
                  `(${box.right.toFixed(1)}, ${box.top.toFixed(1)})`);
    }
  } else {
    console.log(`  No character found (result: ${centreIndex})`);
  }

  // Calculate average character width
  let totalWidth = 0;
  let charCount = 0;

  for (let i = 0; i < Math.min(100, text.length); i++) {
    const box = page.getCharBox(i);
    if (box && text[i] !== ' ' && text[i] !== '\n') {
      totalWidth += box.right - box.left;
      charCount++;
    }
  }

  if (charCount > 0) {
    console.log(`\nAverage character width: ${(totalWidth / charCount).toFixed(2)} points`);
  }
}

demonstrateCharacterPositioning('document.pdf').catch(console.error);
```

## Coordinate System Notes

- All coordinates are in **page coordinate space** (points)
- Origin (0, 0) is at the **bottom-left** of the page
- Y values increase **upward**
- To convert to screen coordinates, you may need to flip the Y axis

```typescript
// Convert page coordinates to screen coordinates (if rendering top-down)
function pageToScreen(box: CharBox, pageHeight: number): CharBox {
  return {
    left: box.left,
    right: box.right,
    top: pageHeight - box.bottom,    // Flip Y
    bottom: pageHeight - box.top,    // Flip Y
  };
}
```

## Performance Considerations

- `getCharBox()` is efficient for individual lookups
- For bulk operations, consider caching results
- `getCharIndexAtPos()` performs a search, so tolerance affects performance

## Limitations

- Character boxes may overlap for some fonts
- Rotated text may have unexpected bounds
- Ligatures (fi, fl) may be treated as single characters
- Right-to-left text requires special handling

## See Also

- [Extract Text Guide](/pdfium/guides/extract-text/) — Basic text extraction
- [Search Text Guide](/pdfium/guides/search-text/) — Finding text with positions
- [Coordinate Systems](/pdfium/concepts/coordinates/) — Understanding PDF coordinates
- [PDFiumPage](/pdfium/api/classes/pdfiumpage/) — Page API reference
