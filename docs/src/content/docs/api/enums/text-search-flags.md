---
title: TextSearchFlags
description: Options for text search operations
---

Flags to control text search behaviour.

## Import

```typescript
import { TextSearchFlags } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `None` | 0x0000 | Case-insensitive, partial match |
| `MatchCase` | 0x0001 | Case-sensitive search |
| `MatchWholeWord` | 0x0002 | Match complete words only |
| `Consecutive` | 0x0004 | Match consecutive occurrences |

## Usage

### Default Search (Case-Insensitive)

```typescript
// Finds: "hello", "Hello", "HELLO", etc.
for (const result of page.findText('hello')) {
  console.log(`Found at ${result.charIndex}`);
}
```

### Case-Sensitive Search

```typescript
// Only finds exact case: "Hello"
for (const result of page.findText('Hello', TextSearchFlags.MatchCase)) {
  console.log(`Found at ${result.charIndex}`);
}
```

### Whole Word Match

```typescript
// Finds "cat" but not "category" or "concatenate"
for (const result of page.findText('cat', TextSearchFlags.MatchWholeWord)) {
  console.log(`Found whole word at ${result.charIndex}`);
}
```

### Combined Flags

```typescript
// Case-sensitive AND whole word
const flags = TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord;

for (const result of page.findText('Invoice', flags)) {
  console.log(`Found exact "Invoice" at ${result.charIndex}`);
}
```

### Checking Flags

```typescript
function hasFlag(flags: TextSearchFlags, flag: TextSearchFlags): boolean {
  return (flags & flag) === flag;
}

const flags = TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord;

console.log(hasFlag(flags, TextSearchFlags.MatchCase));      // true
console.log(hasFlag(flags, TextSearchFlags.MatchWholeWord)); // true
console.log(hasFlag(flags, TextSearchFlags.Consecutive));    // false
```

## Examples

### Search with Options

```typescript
interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

function search(
  page: PDFiumPage,
  query: string,
  options: SearchOptions = {}
) {
  let flags = TextSearchFlags.None;

  if (options.caseSensitive) {
    flags |= TextSearchFlags.MatchCase;
  }
  if (options.wholeWord) {
    flags |= TextSearchFlags.MatchWholeWord;
  }

  return [...page.findText(query, flags)];
}

// Usage
const results = search(page, 'important', {
  caseSensitive: true,
  wholeWord: true,
});
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — findText method
- [Search Text Guide](/pdfium/guides/search-text/) — Text search patterns
