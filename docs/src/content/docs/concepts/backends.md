---
title: "Backends: Native vs WASM"
description: Choosing between the high-performance Native backend and the universal WASM backend
---

@scaryterry/pdfium supports two distinct backends for executing PDF operations. Understanding the difference is key to optimising your application.

## Quick Comparison

| Feature | WASM Backend | Native Backend |
|---------|--------------|----------------|
| **Environment** | Universal (Browser + Node) | Node.js Only |
| **Setup** | Zero configuration | Requires platform package |
| **Performance** | High (Near-Native) | Maximum (Direct C++) |
| **Memory** | Manual / Garbage Collected | System Allocator |
| **Dependencies** | None (Bundled) | Platform-specific (`.node` file) |
| **Portability** | Runs anywhere | OS/Arch specific |
| **Interactive Forms** | ✅ Full Support | ❌ Not yet supported |
| **Document Creation** | ✅ Supported | ❌ Not supported |
| **Progressive Loading** | ✅ Supported | ❌ Not supported |

## WASM Backend

This is the default backend. It uses a WebAssembly-compiled version of the PDFium C++ library.

### Pros
*   **Universal:** Runs in Chrome, Firefox, Safari, Edge, and Node.js.
*   **Zero Config:** The `.wasm` file is bundled with the package. No need to install separate binaries.
*   **Secure:** Runs inside the WASM sandbox, isolating memory access.

### Cons
*   **Overhead:** Marshalling data (especially large images) between JavaScript memory and WASM memory has a cost.
*   **Startup Time:** Compiling the WASM module can take a few milliseconds (or longer on low-end devices).

### Usage (Default)
```typescript
// Uses WASM automatically
using pdfium = await PDFium.init();
```

## Native Backend (Node.js Only)

The Native backend uses Node-API (N-API) to bind directly to the system's compiled PDFium library.

### Pros
*   **Maximum Speed:** Eliminates the WASM bridge overhead. Rendering large bitmaps is significantly faster because memory can be shared or copied more efficiently.
*   **No Compilation:** No WASM compilation step at runtime.

### Cons
*   **Setup:** You must install the specific package for your operating system (e.g., `@scaryterry/pdfium-darwin-arm64`).
*   **Node.js Only:** Cannot be used in browsers.

### Usage

First, install the platform package:
```bash
pnpm add @scaryterry/pdfium-darwin-arm64  # macOS M1/M2/M3
# OR
pnpm add @scaryterry/pdfium-linux-x64-gnu # Linux Server
```

Then, request the native backend in your code:
```typescript
using pdfium = await PDFium.init({ useNative: true });
```

### Fallback Behaviour
The `init({ useNative: true })` call is designed to fail gracefully. If the native package is not found or fails to load, it will automatically fall back to the WASM backend (unless you throw an error manually).

## Performance Benchmarks

*(Approximate — measured on a simple test document; your results will vary with document complexity and hardware.)*

| Operation | WASM | Native | Improvement |
|-----------|------|--------|-------------|
| **Document load** | 2.5ms | 1.8ms | **~1.4x** |
| **Page render (1×)** | 15ms | 12ms | **~1.25x** |
| **Text extraction** | 0.8ms | 0.5ms | **~1.6x** |
| **Character operations** | 0.3ms | 0.15ms | **~2x** |

The native backend's advantage grows with data-heavy operations (large bitmap renders, bulk character access) because it avoids WASM memory marshalling. For heavy rendering workloads or high-throughput server applications, the native backend is recommended. For CLI tools or lighter workloads, WASM is often sufficient and easier to distribute.
