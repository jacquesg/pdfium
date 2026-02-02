---
title: Search Text
description: Finding text with position information in PDFs
---

The library provides text search capabilities that return both the location and bounding rectangles of found text.

## Overview

Text search features:
- Case-sensitive and case-insensitive search
- Whole word matching
- Position and bounding box information
- Multiple occurrences per page

## Basic Search

```typescript
using page = document.getPage(0);

for (const result of page.findText('invoice')) {
  console.log(`Found at character ${result.charIndex}`);
  console.log(`Match length: ${result.charCount}`);
}
```

## Search Options

```typescript
import { TextSearchFlags } from '@scaryterry/pdfium';
```

### Available Flags

| Flag | Description |
|------|-------------|
| `None` | Case-insensitive, partial match (default) |
| `MatchCase` | Case-sensitive search |
| `MatchWholeWord` | Match complete words only |
| `Consecutive` | Match consecutive occurrences |

### Combining Flags

```typescript
// Case-sensitive, whole word
const flags = TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord;

for (const result of page.findText('Invoice', flags)) {
  console.log(`Found exact match at ${result.charIndex}`);
}
```

## Search Results

Each result contains:

```typescript
interface TextSearchResult {
  charIndex: number;   // Starting character index
  charCount: number;   // Number of matched characters
  rects: TextRect[];   // Bounding rectangles
}

interface TextRect {
  left: number;   // Left edge in points
  top: number;    // Top edge in points
  right: number;  // Right edge in points
  bottom: number; // Bottom edge in points
}
```

### Why Multiple Rectangles?

A single match may span multiple lines or have complex layout:

```
┌─────────────────────────┐
│ This is a search term   │ ← Rect 1
│ that spans two lines    │ ← Rect 2
└─────────────────────────┘
```

## Search Examples

### Case-Insensitive (Default)

```typescript
// Finds: "hello", "Hello", "HELLO", etc.
for (const result of page.findText('hello')) {
  console.log(`Found at ${result.charIndex}`);
}
```

### Case-Sensitive

```typescript
import { TextSearchFlags } from '@scaryterry/pdfium';

// Only finds exact case match
for (const result of page.findText('Hello', TextSearchFlags.MatchCase)) {
  console.log(`Found exact case at ${result.charIndex}`);
}
```

### Whole Word Match

```typescript
// "hello" but not "helloworld"
for (const result of page.findText('hello', TextSearchFlags.MatchWholeWord)) {
  console.log(`Found whole word at ${result.charIndex}`);
}
```

### Count Occurrences

```typescript
function countOccurrences(page: PDFiumPage, query: string): number {
  let count = 0;
  for (const _ of page.findText(query)) {
    count++;
  }
  return count;
}

const count = countOccurrences(page, 'important');
console.log(`Found ${count} occurrences`);
```

### Collect All Results

```typescript
function findAll(page: PDFiumPage, query: string): TextSearchResult[] {
  return [...page.findText(query)];
}

const results = findAll(page, 'error');
console.log(`Found ${results.length} matches`);
```

## Multi-Page Search

### Search Entire Document

```typescript
interface DocumentSearchResult {
  pageIndex: number;
  charIndex: number;
  charCount: number;
  rects: TextRect[];
}

function searchDocument(
  document: PDFiumDocument,
  query: string,
  flags?: TextSearchFlags
): DocumentSearchResult[] {
  const results: DocumentSearchResult[] = [];

  for (const page of document.pages()) {
    using p = page;

    for (const match of p.findText(query, flags)) {
      results.push({
        pageIndex: p.index,
        ...match,
      });
    }
  }

  return results;
}

// Usage
const results = searchDocument(document, 'important');
for (const result of results) {
  console.log(`Page ${result.pageIndex + 1}: found at char ${result.charIndex}`);
}
```

### Search with Early Exit

```typescript
function findFirst(
  document: PDFiumDocument,
  query: string
): { pageIndex: number; result: TextSearchResult } | null {
  for (const page of document.pages()) {
    using p = page;

    for (const result of p.findText(query)) {
      return { pageIndex: p.index, result };
    }
  }

  return null;
}

const first = findFirst(document, 'confidential');
if (first) {
  console.log(`First occurrence on page ${first.pageIndex + 1}`);
}
```

## Highlighting Search Results

### Get Highlight Coordinates

```typescript
function getHighlightRects(
  page: PDFiumPage,
  query: string,
  scale: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const highlights: Array<{ x: number; y: number; width: number; height: number }> = [];
  const pageHeight = page.height;

  for (const result of page.findText(query)) {
    for (const rect of result.rects) {
      highlights.push({
        x: rect.left * scale,
        y: (pageHeight - rect.top) * scale, // Flip Y for screen coordinates
        width: (rect.right - rect.left) * scale,
        height: (rect.top - rect.bottom) * scale,
      });
    }
  }

  return highlights;
}

// Usage for rendering
const scale = 2;
const highlights = getHighlightRects(page, 'search term', scale);

// Draw highlights on canvas
for (const h of highlights) {
  ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
  ctx.fillRect(h.x, h.y, h.width, h.height);
}
```

### Full Highlight Example

```typescript
import sharp from 'sharp';

async function renderWithHighlights(
  page: PDFiumPage,
  query: string,
  scale: number
) {
  const { data, width, height } = page.render({ scale });

  // Get highlight rectangles
  const highlights = getHighlightRects(page, query, scale);

  // Create SVG overlay
  const svgRects = highlights.map(h =>
    `<rect x="${h.x}" y="${h.y}" width="${h.width}" height="${h.height}" ` +
    `fill="yellow" fill-opacity="0.4"/>`
  ).join('');

  const svg = `
    <svg width="${width}" height="${height}">
      ${svgRects}
    </svg>
  `;

  // Composite with sharp
  return sharp(data, { raw: { width, height, channels: 4 } })
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();
}
```

## Search Statistics

```typescript
interface SearchStats {
  query: string;
  totalMatches: number;
  pagesWithMatches: number;
  matchesByPage: Map<number, number>;
}

function getSearchStats(
  document: PDFiumDocument,
  query: string
): SearchStats {
  const matchesByPage = new Map<number, number>();
  let totalMatches = 0;

  for (const page of document.pages()) {
    using p = page;
    let pageMatches = 0;

    for (const _ of p.findText(query)) {
      pageMatches++;
      totalMatches++;
    }

    if (pageMatches > 0) {
      matchesByPage.set(p.index, pageMatches);
    }
  }

  return {
    query,
    totalMatches,
    pagesWithMatches: matchesByPage.size,
    matchesByPage,
  };
}

// Usage
const stats = getSearchStats(document, 'important');
console.log(`"${stats.query}": ${stats.totalMatches} matches on ${stats.pagesWithMatches} pages`);
```

## Complete Example

```typescript
import { PDFium, TextSearchFlags } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function searchPDF(pdfPath: string, query: string) {
  const data = await fs.readFile(pdfPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log(`Searching for "${query}" in ${pdfPath}`);
  console.log(`Total pages: ${document.pageCount}\n`);

  let totalMatches = 0;

  for (const page of document.pages()) {
    using p = page;
    const matches = [...p.findText(query)];

    if (matches.length === 0) continue;

    console.log(`Page ${p.index + 1}: ${matches.length} match(es)`);

    for (const match of matches) {
      totalMatches++;

      // Get context from page text
      const text = p.getText();
      const start = Math.max(0, match.charIndex - 20);
      const end = Math.min(text.length, match.charIndex + match.charCount + 20);
      const context = text.slice(start, end).replace(/\n/g, ' ');

      console.log(`  [${match.charIndex}] "...${context}..."`);

      // Show first rectangle position
      if (match.rects.length > 0) {
        const rect = match.rects[0];
        console.log(`    Position: (${rect.left.toFixed(1)}, ${rect.bottom.toFixed(1)})`);
      }
    }
  }

  console.log(`\nTotal matches: ${totalMatches}`);
}

searchPDF('document.pdf', 'invoice');
```

Output:

```
Searching for "invoice" in document.pdf
Total pages: 10

Page 1: 3 match(es)
  [45] "...Thank you for your invoice payment. This..."
    Position: (72.0, 680.5)
  [234] "...Please see the attached invoice for details..."
    Position: (72.0, 520.3)
  [567] "...Invoice number: INV-2024..."
    Position: (400.0, 720.0)

Page 3: 1 match(es)
  [123] "...Previous invoice reference..."
    Position: (72.0, 600.0)

Total matches: 4
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Page API reference
- [TextSearchFlags Enum](/pdfium/api/enums/text-search-flags/) — Search flags
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction
- [Character Positioning Guide](/pdfium/guides/character-positioning/) — Character bounds
