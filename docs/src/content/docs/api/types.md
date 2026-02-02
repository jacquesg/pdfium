---
title: Types
description: Branded types and type aliases for @scaryterry/pdfium
---

This page documents branded types used for type-safe WASM handle management.

## What are Branded Types?

Branded types add a phantom "brand" to primitive types, preventing accidental misuse:

```typescript
// Without branding, these could be confused:
const docHandle: number = 12345;
const pageHandle: number = 67890;
closeDocument(pageHandle); // No error, but wrong!

// With branding:
const docHandle: DocumentHandle = 12345 as DocumentHandle;
const pageHandle: PageHandle = 67890 as PageHandle;
closeDocument(pageHandle); // TypeScript error!
```

## Handle Types

### WASMPointer

Generic pointer to WASM memory.

```typescript
declare const wasmPointerBrand: unique symbol;
type WASMPointer = number & { readonly [wasmPointerBrand]: never };
```

### DocumentHandle

Handle to a loaded PDF document.

```typescript
declare const documentBrand: unique symbol;
type DocumentHandle = number & { readonly [documentBrand]: never };
```

Used internally by:
- `PDFiumDocument.handle`
- `PDFiumDocumentBuilder.handle`

### PageHandle

Handle to a loaded PDF page.

```typescript
declare const pageBrand: unique symbol;
type PageHandle = number & { readonly [pageBrand]: never };
```

Used internally by:
- `PDFiumPage.handle`
- `PDFiumPageBuilder.handle`

### FormHandle

Handle to form fill environment.

```typescript
declare const formBrand: unique symbol;
type FormHandle = number & { readonly [formBrand]: never };
```

Used for rendering interactive form fields.

### BitmapHandle

Handle to a bitmap in WASM memory.

```typescript
declare const bitmapBrand: unique symbol;
type BitmapHandle = number & { readonly [bitmapBrand]: never };
```

Used during page rendering.

### TextPageHandle

Handle to text extraction context.

```typescript
declare const textPageBrand: unique symbol;
type TextPageHandle = number & { readonly [textPageBrand]: never };
```

Used for text extraction operations.

### SearchHandle

Handle to text search context.

```typescript
declare const searchBrand: unique symbol;
type SearchHandle = number & { readonly [searchBrand]: never };
```

Used by `findText()` iterator.

### BookmarkHandle

Handle to bookmark/outline entry.

```typescript
declare const bookmarkBrand: unique symbol;
type BookmarkHandle = number & { readonly [bookmarkBrand]: never };
```

Used when traversing bookmarks.

### DestinationHandle

Handle to PDF destination.

```typescript
declare const destBrand: unique symbol;
type DestinationHandle = number & { readonly [destBrand]: never };
```

Used for bookmark navigation targets.

### AnnotationHandle

Handle to annotation.

```typescript
declare const annotBrand: unique symbol;
type AnnotationHandle = number & { readonly [annotBrand]: never };
```

Used when accessing annotations.

### AttachmentHandle

Handle to file attachment.

```typescript
declare const attachmentBrand: unique symbol;
type AttachmentHandle = number & { readonly [attachmentBrand]: never };
```

Used when extracting attachments.

### PageObjectHandle

Handle to page object.

```typescript
declare const pageObjectBrand: unique symbol;
type PageObjectHandle = number & { readonly [pageObjectBrand]: never };
```

Used when iterating page objects.

### FontHandle

Handle to loaded font.

```typescript
declare const fontBrand: unique symbol;
type FontHandle = number & { readonly [fontBrand]: never };
```

Used by `loadStandardFont()` and `addText()`.

### StructTreeHandle

Handle to structure tree.

```typescript
declare const structTreeBrand: unique symbol;
type StructTreeHandle = number & { readonly [structTreeBrand]: never };
```

Used for tagged PDF structure.

### StructElementHandle

Handle to structure element.

```typescript
declare const structElementBrand: unique symbol;
type StructElementHandle = number & { readonly [structElementBrand]: never };
```

Used when traversing structure tree.

### AvailabilityHandle

Handle for progressive loading availability checks.

```typescript
declare const availabilityBrand: unique symbol;
type AvailabilityHandle = number & { readonly [availabilityBrand]: never };
```

Used by `ProgressivePDFLoader`.

## Native Handle Type

### NativeHandle

Union of all handle types for generic WASM operations:

```typescript
type NativeHandle =
  | DocumentHandle
  | PageHandle
  | FormHandle
  | BitmapHandle
  | TextPageHandle
  | SearchHandle
  | BookmarkHandle
  | DestinationHandle
  | AnnotationHandle
  | AttachmentHandle
  | PageObjectHandle
  | FontHandle
  | StructTreeHandle
  | StructElementHandle
  | AvailabilityHandle;
```

## Usage Notes

### Accessing Handles

Handles are primarily for internal use, but are exposed for advanced scenarios:

```typescript
// Access document handle for advanced WASM operations
const docHandle = document.handle;
```

:::caution
Directly using handles requires knowledge of the PDFium C API and can bypass the library's safety features. Use with caution.
:::

### Type Safety Benefits

Branded types prevent errors like:

```typescript
// These would compile without branding:
function closePage(handle: number) { ... }
function closeDocument(handle: number) { ... }

closePage(documentHandle); // Logic error!

// With branding, TypeScript catches this:
function closePage(handle: PageHandle) { ... }
function closeDocument(handle: DocumentHandle) { ... }

closePage(documentHandle); // Error: Type 'DocumentHandle' is not assignable to 'PageHandle'
```

## See Also

- [Interfaces](/pdfium/api/interfaces/) — Interface definitions
- [Architecture](/pdfium/concepts/architecture/) — How handles work
- [Memory Management](/pdfium/concepts/memory/) — WASM memory details
