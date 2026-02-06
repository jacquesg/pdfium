---
title: Bookmarks
description: Working with PDF bookmarks (outlines)
---

Bookmarks (also called outlines) provide a table of contents for navigating PDF documents. This guide explains how to read and traverse bookmarks.

## Overview

Bookmarks form a hierarchical tree:

```
Document Outline
├── Chapter 1: Introduction
│   ├── 1.1 Background
│   └── 1.2 Scope
├── Chapter 2: Methods
│   ├── 2.1 Data Collection
│   └── 2.2 Analysis
└── Chapter 3: Results
```

## Getting Bookmarks

```typescript
const bookmarks = document.getBookmarks();
console.log(`Found ${bookmarks.length} top-level bookmarks`);
```

## Bookmark Structure

Each bookmark has:

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Display text |
| `pageIndex` | `number \| undefined` | Target page (if any) |
| `children` | `Bookmark[]` | Nested bookmarks |

```typescript
interface Bookmark {
  title: string;
  pageIndex?: number;
  children: Bookmark[];
}
```

## Traversing Bookmarks

### Recursive Printing

```typescript
function printBookmarks(bookmarks: Bookmark[], indent = 0) {
  for (const bookmark of bookmarks) {
    const prefix = '  '.repeat(indent);
    const page = bookmark.pageIndex !== undefined
      ? ` (page ${bookmark.pageIndex + 1})`
      : '';

    console.log(`${prefix}${bookmark.title}${page}`);

    if (bookmark.children.length > 0) {
      printBookmarks(bookmark.children, indent + 1);
    }
  }
}

const bookmarks = document.getBookmarks();
printBookmarks(bookmarks);
```

### Flattening to Array

```typescript
interface FlatBookmark {
  title: string;
  pageIndex?: number;
  depth: number;
  path: string[];
}

function flattenBookmarks(
  bookmarks: Bookmark[],
  depth = 0,
  path: string[] = []
): FlatBookmark[] {
  const result: FlatBookmark[] = [];

  for (const bookmark of bookmarks) {
    const currentPath = [...path, bookmark.title];

    result.push({
      title: bookmark.title,
      pageIndex: bookmark.pageIndex,
      depth,
      path: currentPath,
    });

    if (bookmark.children.length > 0) {
      result.push(...flattenBookmarks(bookmark.children, depth + 1, currentPath));
    }
  }

  return result;
}

// Usage
const flat = flattenBookmarks(document.getBookmarks());
for (const item of flat) {
  console.log(`${'  '.repeat(item.depth)}${item.title}`);
}
```

### Iterator Pattern

```typescript
function* walkBookmarks(bookmarks: Bookmark[]): Generator<Bookmark> {
  for (const bookmark of bookmarks) {
    yield bookmark;
    if (bookmark.children.length > 0) {
      yield* walkBookmarks(bookmark.children);
    }
  }
}

// Usage
for (const bookmark of walkBookmarks(document.getBookmarks())) {
  if (bookmark.pageIndex !== undefined) {
    console.log(`${bookmark.title} → page ${bookmark.pageIndex + 1}`);
  }
}
```

## Counting Bookmarks

### Total Count

```typescript
function countBookmarks(bookmarks: Bookmark[]): number {
  let count = bookmarks.length;

  for (const bookmark of bookmarks) {
    count += countBookmarks(bookmark.children);
  }

  return count;
}

const total = countBookmarks(document.getBookmarks());
console.log(`Total bookmarks: ${total}`);
```

### Count by Depth

```typescript
function countByDepth(bookmarks: Bookmark[], depth = 0): Map<number, number> {
  const counts = new Map<number, number>();

  function count(items: Bookmark[], d: number) {
    counts.set(d, (counts.get(d) || 0) + items.length);

    for (const item of items) {
      if (item.children.length > 0) {
        count(item.children, d + 1);
      }
    }
  }

  count(bookmarks, depth);
  return counts;
}

const depthCounts = countByDepth(document.getBookmarks());
for (const [depth, count] of depthCounts) {
  console.log(`Depth ${depth}: ${count} bookmarks`);
}
```

## Finding Bookmarks

### By Title

```typescript
function findBookmark(bookmarks: Bookmark[], title: string): Bookmark | undefined {
  for (const bookmark of bookmarks) {
    if (bookmark.title === title) {
      return bookmark;
    }

    const found = findBookmark(bookmark.children, title);
    if (found) return found;
  }

  return undefined;
}

const found = findBookmark(document.getBookmarks(), 'Chapter 2');
if (found) {
  console.log(`Found: ${found.title} at page ${found.pageIndex}`);
}
```

### By Page

```typescript
function findBookmarksForPage(
  bookmarks: Bookmark[],
  pageIndex: number
): Bookmark[] {
  const results: Bookmark[] = [];

  function search(items: Bookmark[]) {
    for (const item of items) {
      if (item.pageIndex === pageIndex) {
        results.push(item);
      }
      search(item.children);
    }
  }

  search(bookmarks);
  return results;
}

// Find all bookmarks pointing to page 5 (index 4)
const pageBookmarks = findBookmarksForPage(document.getBookmarks(), 4);
```

### Search by Pattern

```typescript
function searchBookmarks(
  bookmarks: Bookmark[],
  pattern: RegExp
): Bookmark[] {
  const results: Bookmark[] = [];

  function search(items: Bookmark[]) {
    for (const item of items) {
      if (pattern.test(item.title)) {
        results.push(item);
      }
      search(item.children);
    }
  }

  search(bookmarks);
  return results;
}

// Find all chapter bookmarks
const chapters = searchBookmarks(document.getBookmarks(), /^Chapter \d+/);
```

## Building Navigation

### Generate HTML TOC

```typescript
function bookmarksToHTML(bookmarks: Bookmark[]): string {
  if (bookmarks.length === 0) return '';

  const items = bookmarks.map(bookmark => {
    const href = bookmark.pageIndex !== undefined
      ? `#page-${bookmark.pageIndex + 1}`
      : '#';

    const children = bookmark.children.length > 0
      ? bookmarksToHTML(bookmark.children)
      : '';

    return `<li><a href="${href}">${escapeHTML(bookmark.title)}</a>${children}</li>`;
  });

  return `<ul>${items.join('')}</ul>`;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const html = bookmarksToHTML(document.getBookmarks());
```

### Generate JSON Structure

```typescript
function bookmarksToJSON(bookmarks: Bookmark[]): object[] {
  return bookmarks.map(bookmark => ({
    title: bookmark.title,
    page: bookmark.pageIndex !== undefined ? bookmark.pageIndex + 1 : null,
    children: bookmark.children.length > 0
      ? bookmarksToJSON(bookmark.children)
      : undefined,
  }));
}

const json = JSON.stringify(bookmarksToJSON(document.getBookmarks()), null, 2);
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function extractTableOfContents(filename: string) {
  const data = await fs.readFile(filename);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  const bookmarks = document.getBookmarks();

  if (bookmarks.length === 0) {
    console.log('No bookmarks found in this document.');
    return;
  }

  console.log('Table of Contents:');
  console.log('==================\n');

  function print(items: Bookmark[], indent = 0) {
    for (const item of items) {
      const prefix = '  '.repeat(indent);
      const dots = '.'.repeat(50 - indent * 2 - item.title.length);
      const page = item.pageIndex !== undefined
        ? String(item.pageIndex + 1).padStart(3)
        : '  -';

      console.log(`${prefix}${item.title} ${dots} ${page}`);

      if (item.children.length > 0) {
        print(item.children, indent + 1);
      }
    }
  }

  print(bookmarks);

  // Count statistics
  function count(items: Bookmark[]): number {
    return items.reduce((sum, item) => sum + 1 + count(item.children), 0);
  }

  console.log(`\nTotal entries: ${count(bookmarks)}`);
  console.log(`Top-level entries: ${bookmarks.length}`);
}

extractTableOfContents('document.pdf');
```

Output:

```
Table of Contents:
==================

Chapter 1: Introduction ........................   1
  1.1 Background ...............................   2
  1.2 Scope ....................................   5
Chapter 2: Methods .............................  10
  2.1 Data Collection ..........................  12
  2.2 Analysis .................................  18
Chapter 3: Results .............................  25

Total entries: 7
Top-level entries: 3
```

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfiumdocument/) — Document API reference
- [Open Document Guide](/pdfium/guides/open-document/) — Loading documents
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction
