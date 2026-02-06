---
title: PDFium
---

[**@scaryterry/pdfium**](../README.md)

***

Defined in: [src/pdfium.ts:140](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L140)

Main PDFium library class.

Use `PDFium.init()` to create an instance. Resources are automatically
cleaned up when disposed.

## Example

```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(pdfBytes);
console.log(`Document has ${document.pageCount} pages`);
```

## Extends

- [`Disposable`](Disposable.md)

## Accessors

### disposed

#### Get Signature

> **get** **disposed**(): `boolean`

Defined in: [src/core/disposable.ts:73](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/core/disposable.ts#L73)

Whether this resource has been disposed.

##### Returns

`boolean`

#### Inherited from

[`Disposable`](Disposable.md).[`disposed`](Disposable.md#disposed)

***

### limits

#### Get Signature

> **get** **limits**(): `Readonly`\<`Required`\<[`PDFiumLimits`](../interfaces/PDFiumLimits.md)\>\>

Defined in: [src/pdfium.ts:461](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L461)

Get the configured resource limits.

##### Returns

`Readonly`\<`Required`\<[`PDFiumLimits`](../interfaces/PDFiumLimits.md)\>\>

## Methods

### \[dispose\]()

> **\[dispose\]**(): `void`

Defined in: [src/core/disposable.ts:148](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/core/disposable.ts#L148)

Dispose of this resource, freeing WASM memory.

This method is idempotent - calling it multiple times has no effect
after the first call.

#### Returns

`void`

#### Inherited from

[`Disposable`](Disposable.md).[`[dispose]`](Disposable.md#dispose)

***

### createDocument()

> **createDocument**(): [`PDFiumDocumentBuilder`](PDFiumDocumentBuilder.md)

Defined in: [src/pdfium.ts:441](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L441)

Create a new empty PDF document.

#### Returns

[`PDFiumDocumentBuilder`](PDFiumDocumentBuilder.md)

A document builder for adding pages and content

***

### createProgressiveLoader()

> **createProgressiveLoader**(`data`): [`ProgressivePDFLoader`](ProgressivePDFLoader.md)

Defined in: [src/pdfium.ts:452](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L452)

Create a progressive loader for linearisation detection and incremental loading.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\> | PDF file data |

#### Returns

[`ProgressivePDFLoader`](ProgressivePDFLoader.md)

A progressive loader instance

***

### dispose()

> **dispose**(): `void`

Defined in: [src/core/disposable.ts:164](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/core/disposable.ts#L164)

Alias for Symbol.dispose for explicit calls.

#### Returns

`void`

#### Example

```typescript
document.dispose();
```

#### Inherited from

[`Disposable`](Disposable.md).[`dispose`](Disposable.md#dispose-2)

***

### openDocument()

> **openDocument**(`data`, `options`): `Promise`\<[`PDFiumDocument`](PDFiumDocument.md)\>

Defined in: [src/pdfium.ts:343](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L343)

Open a PDF document from binary data.

Note: The `password` option accepts a JavaScript string. JS strings cannot
be securely zeroed after use — they are immutable and garbage collected at
an unpredictable time. For highly sensitive passwords, consider the trade-offs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\> | PDF file data |
| `options` | [`OpenDocumentOptions`](../interfaces/OpenDocumentOptions.md) | Document options (e.g., password, onProgress) |

#### Returns

`Promise`\<[`PDFiumDocument`](PDFiumDocument.md)\>

The loaded document

#### Throws

If the document cannot be opened

***

### init()

#### Call Signature

> `static` **init**(`options`): `Promise`\<[`WorkerPDFium`](WorkerPDFium.md)\>

Defined in: [src/pdfium.ts:176](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L176)

Initialise the PDFium library.

When `useNative` is true, attempts to load the native addon first.
Falls back to WASM if native is unavailable.

When `forceWasm` is true, always uses WASM backend regardless of native availability.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`PDFiumInitOptions`](../interfaces/PDFiumInitOptions.md) & `object` | Initialisation options |

##### Returns

`Promise`\<[`WorkerPDFium`](WorkerPDFium.md)\>

The PDFium or NativePDFiumInstance

##### Throws

If initialisation fails or options conflict

#### Call Signature

> `static` **init**(`options`): `Promise`\<`PDFium`\>

Defined in: [src/pdfium.ts:177](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L177)

Initialise the PDFium library.

When `useNative` is true, attempts to load the native addon first.
Falls back to WASM if native is unavailable.

When `forceWasm` is true, always uses WASM backend regardless of native availability.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`PDFiumInitOptions`](../interfaces/PDFiumInitOptions.md) & `object` | Initialisation options |

##### Returns

`Promise`\<`PDFium`\>

The PDFium or NativePDFiumInstance

##### Throws

If initialisation fails or options conflict

#### Call Signature

> `static` **init**(`options`): `Promise`\<[`NativePDFiumInstance`](NativePDFiumInstance.md) \| `PDFium`\>

Defined in: [src/pdfium.ts:178](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L178)

Initialise the PDFium library.

When `useNative` is true, attempts to load the native addon first.
Falls back to WASM if native is unavailable.

When `forceWasm` is true, always uses WASM backend regardless of native availability.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`PDFiumInitOptions`](../interfaces/PDFiumInitOptions.md) & `object` | Initialisation options |

##### Returns

`Promise`\<[`NativePDFiumInstance`](NativePDFiumInstance.md) \| `PDFium`\>

The PDFium or NativePDFiumInstance

##### Throws

If initialisation fails or options conflict

#### Call Signature

> `static` **init**(`options?`): `Promise`\<`PDFium`\>

Defined in: [src/pdfium.ts:179](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L179)

Initialise the PDFium library.

When `useNative` is true, attempts to load the native addon first.
Falls back to WASM if native is unavailable.

When `forceWasm` is true, always uses WASM backend regardless of native availability.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`PDFiumInitOptions`](../interfaces/PDFiumInitOptions.md) | Initialisation options |

##### Returns

`Promise`\<`PDFium`\>

The PDFium or NativePDFiumInstance

##### Throws

If initialisation fails or options conflict

***

### initNative()

> `static` **initNative**(`options`): `Promise`\<[`NativePDFiumInstance`](NativePDFiumInstance.md) \| `null`\>

Defined in: [src/pdfium.ts:302](https://github.com/jacquesg/pdfium/blob/aed06a44016ab347fbf6eacb7b40f47962218b9f/src/pdfium.ts#L302)

Initialise a native PDFium instance (Node.js only).

Returns a `NativePDFiumInstance` backed by the platform-specific native addon.
The instance provides core document operations (page count, text extraction,
rendering) without WASM.

Returns `null` if the native addon is not available for the current platform.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `limits?`: [`PDFiumLimits`](../interfaces/PDFiumLimits.md); \} | Optional resource limits |
| `options.limits?` | [`PDFiumLimits`](../interfaces/PDFiumLimits.md) | - |

#### Returns

`Promise`\<[`NativePDFiumInstance`](NativePDFiumInstance.md) \| `null`\>

The native instance, or null if unavailable
