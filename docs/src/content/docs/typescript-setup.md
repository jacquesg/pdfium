---
title: TypeScript Setup
description: Configuring TypeScript for @scaryterry/pdfium
---

This guide covers TypeScript configuration for optimal library usage.

## Recommended Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## The `using` Keyword

ES2024 introduced explicit resource management with `using`:

```typescript
using pdfium = await PDFium.init();
// Automatically disposed when scope ends
```

### Enabling `using`

**Option 1: Target ES2022 with lib**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**Option 2: Target ES2024**

```json
{
  "compilerOptions": {
    "target": "ES2024"
  }
}
```

### Without `using`

If you can't use `using`, dispose manually:

```typescript
const pdfium = await PDFium.init();
try {
  const document = await pdfium.openDocument(data);
  try {
    const page = document.getPage(0);
    try {
      return page.getText();
    } finally {
      page.dispose();
    }
  } finally {
    document.dispose();
  }
} finally {
  pdfium.dispose();
}
```

## Strict Mode

The library is written in strict TypeScript. Enable strict mode:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables:
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

## Branded Types

The library uses branded types for type-safe handles:

```typescript
// These are distinct types
type DocumentHandle = number & { readonly __brand: 'DocumentHandle' };
type PageHandle = number & { readonly __brand: 'PageHandle' };

// TypeScript prevents mixing them
function closeDocument(handle: DocumentHandle) { ... }
closeDocument(pageHandle); // Error!
```

## Import Examples

### Named Imports

```typescript
import {
  PDFium,
  PDFiumDocument,
  PDFiumPage,
  PDFiumErrorCode,
  PageRotation,
  AnnotationType,
} from '@scaryterry/pdfium';
```

### Type Imports

```typescript
import type {
  RenderOptions,
  RenderResult,
  Bookmark,
  Annotation,
} from '@scaryterry/pdfium';
```

### Combined

```typescript
import {
  PDFium,
  PDFiumErrorCode,
  type RenderOptions,
  type Bookmark,
} from '@scaryterry/pdfium';
```

## Error Handling Types

```typescript
import {
  PDFiumError,
  DocumentError,
  PageError,
  RenderError,
  PDFiumErrorCode,
} from '@scaryterry/pdfium';

try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError) {
    // TypeScript knows error.code is PDFiumErrorCode
    if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
      // Handle password...
    }
  }
}
```

## Type Narrowing

### Page Objects

```typescript
import { PageObjectType } from '@scaryterry/pdfium';

for (const obj of page.getObjects()) {
  if (obj.type === PageObjectType.Text) {
    // TypeScript knows: obj is TextObject
    console.log(obj.text, obj.fontSize);
  } else if (obj.type === PageObjectType.Image) {
    // TypeScript knows: obj is ImageObject
    console.log(obj.width, obj.height);
  }
}
```

### Annotations

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

const annotation = page.getAnnotation(0);
if (annotation.type === AnnotationType.Highlight) {
  // Process highlight
}
```

## Generic Patterns

### Type-Safe Page Processor

```typescript
function processPage<T>(
  document: PDFiumDocument,
  pageIndex: number,
  fn: (page: PDFiumPage) => T
): T {
  using page = document.getPage(pageIndex);
  return fn(page);
}

// Usage
const text = processPage(document, 0, (page) => page.getText());
// text is inferred as string
```

### Async Page Processor

```typescript
async function processPageAsync<T>(
  document: PDFiumDocument,
  pageIndex: number,
  fn: (page: PDFiumPage) => Promise<T>
): Promise<T> {
  using page = document.getPage(pageIndex);
  return await fn(page);
}
```

## Configuration Files

### Node.js Project

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### Vite Project

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Next.js Project

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## See Also

- [Installation](/pdfium/installation/) — Package installation
- [Quick Start](/pdfium/quick-start/) — Getting started
- [Resource Management](/pdfium/concepts/resource-management/) — Using disposal
