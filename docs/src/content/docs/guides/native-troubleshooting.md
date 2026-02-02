---
title: Native Backend Troubleshooting
description: Diagnosing and resolving native backend issues
---

This guide helps diagnose and resolve issues with the native PDFium backend in Node.js.

## Native Backend Not Loading

### Symptoms

```typescript
const pdfium = await PDFium.init({ useNative: true });
// Returns PDFium (WASM) instead of NativePDFiumInstance
```

### Diagnosis Steps

1. **Check if native is available:**

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';

const pdfium = await PDFium.init({ useNative: true });
console.log('Backend:', pdfium instanceof NativePDFiumInstance ? 'Native' : 'WASM');
```

2. **Check native directly:**

```typescript
const native = await PDFium.initNative();
if (!native) {
  console.log('Native backend unavailable');
} else {
  console.log('Native backend available');
  native.dispose();
}
```

3. **Check installed packages:**

```bash
pnpm list | grep pdfium
```

## Common Causes

### Platform Package Not Installed

The native backend requires a platform-specific package:

| Platform | Package |
|----------|---------|
| macOS Apple Silicon | `@scaryterry/pdfium-darwin-arm64` |
| macOS Intel | `@scaryterry/pdfium-darwin-x64` |
| Linux x64 (glibc) | `@scaryterry/pdfium-linux-x64-gnu` |
| Linux ARM64 (glibc) | `@scaryterry/pdfium-linux-arm64-gnu` |
| Windows x64 | `@scaryterry/pdfium-win32-x64-msvc` |

**Solution:** Install the correct package:

```bash
# Check your platform
node -e "console.log(process.platform, process.arch)"

# Install appropriate package
pnpm add @scaryterry/pdfium-darwin-arm64  # macOS Apple Silicon
pnpm add @scaryterry/pdfium-linux-x64-gnu # Linux x64
```

### Architecture Mismatch

The installed package must match your CPU architecture.

**Common mistake:** Installing x64 package on ARM64 (Apple Silicon, AWS Graviton).

**Solution:**

```bash
# Check your architecture
node -e "console.log(process.arch)"

# Reinstall correct package
pnpm remove @scaryterry/pdfium-darwin-x64
pnpm add @scaryterry/pdfium-darwin-arm64
```

### glibc vs musl (Alpine Linux)

The Linux packages are built against glibc. Alpine Linux uses musl libc.

**Symptom:** `Error: Error loading shared library` or `GLIBC_X.XX not found`

**Solutions:**

1. Use a glibc-based image (Debian, Ubuntu):

```dockerfile
# Instead of alpine
FROM node:22-slim
```

2. Or use the WASM backend (recommended for containers):

```typescript
// Don't request native in Alpine
using pdfium = await PDFium.init();
```

## Library Loading Errors

### macOS Code Signing

**Symptom:** `code signature invalid` or `not valid for use in process`

This can occur if the binary is modified or if Gatekeeper blocks it.

**Solutions:**

1. Re-sign the binary:

```bash
codesign --force --sign - node_modules/@scaryterry/pdfium-darwin-arm64/*.node
```

2. Clear quarantine:

```bash
xattr -d com.apple.quarantine node_modules/@scaryterry/pdfium-darwin-arm64/*.node
```

### Linux Missing Dependencies

**Symptom:** `error while loading shared libraries`

The native binary may require system libraries.

**Solution:** Install required packages:

```bash
# Debian/Ubuntu
apt-get install libc6 libstdc++6

# RHEL/CentOS
yum install glibc libstdc++
```

### Windows Visual C++ Runtime

**Symptom:** `The specified module could not be found` or `VCRUNTIME140.dll`

**Solution:** Install Visual C++ Redistributable:

Download from [Microsoft](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)

## Performance Issues

### Verifying Native is Active

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';

const pdfium = await PDFium.init({ useNative: true });

if (pdfium instanceof NativePDFiumInstance) {
  console.log('✓ Using native backend');
} else {
  console.log('✗ Fell back to WASM - check platform package installation');
}
```

### Benchmark Comparison

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';

async function benchmark() {
  const data = await fs.readFile('test.pdf');

  // WASM
  const wasmPdfium = await PDFium.init({ forceWasm: true });
  const wasmStart = performance.now();
  const wasmDoc = await wasmPdfium.openDocument(data);
  const wasmPage = wasmDoc.getPage(0);
  wasmPage.render({ scale: 2 });
  const wasmTime = performance.now() - wasmStart;
  wasmPage.dispose();
  wasmDoc.dispose();
  wasmPdfium.dispose();

  // Native
  const nativePdfium = await PDFium.init({ useNative: true });
  if (nativePdfium instanceof NativePDFiumInstance) {
    const nativeStart = performance.now();
    const nativeDoc = nativePdfium.openDocument(data);
    const nativePage = nativeDoc.getPage(0);
    nativePage.render({ scale: 2 });
    const nativeTime = performance.now() - nativeStart;
    nativePage.dispose();
    nativeDoc.dispose();
    nativePdfium.dispose();

    console.log(`WASM: ${wasmTime.toFixed(2)}ms`);
    console.log(`Native: ${nativeTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(wasmTime / nativeTime).toFixed(2)}x`);
  }
}
```

## Docker and Containers

### glibc vs Alpine

```dockerfile
# RECOMMENDED: Use glibc-based image
FROM node:22-slim

# NOT RECOMMENDED: Alpine uses musl
# FROM node:22-alpine
```

### Multi-platform Builds

For multi-architecture Docker images:

```dockerfile
FROM node:22-slim

# Install platform package based on architecture
RUN case "$(uname -m)" in \
      x86_64) pnpm add @scaryterry/pdfium-linux-x64-gnu ;; \
      aarch64) pnpm add @scaryterry/pdfium-linux-arm64-gnu ;; \
    esac
```

Or use buildx with platform-specific builds:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      platforms:
        - linux/amd64
        - linux/arm64
```

### Container Best Practice

For containers, consider always using WASM for simplicity:

```typescript
// Simpler container deployment
using pdfium = await PDFium.init({ forceWasm: true });
```

This eliminates platform package complexity and works identically across all containers.

## Fallback Behaviour

The library handles native unavailability gracefully:

```typescript
// useNative: true falls back to WASM if native unavailable
const pdfium = await PDFium.init({ useNative: true });
// Always returns a working instance (native or WASM)
```

To require native and fail if unavailable:

```typescript
const native = await PDFium.initNative();
if (!native) {
  throw new Error('Native backend required but unavailable');
}
```

## Reporting Issues

If you encounter native backend issues, include:

1. **Platform info:**

```bash
node -e "console.log({ platform: process.platform, arch: process.arch, version: process.version })"
```

2. **Installed packages:**

```bash
pnpm list | grep pdfium
```

3. **Error message** (full stack trace)

4. **Minimal reproduction** if possible

Open issues at: https://github.com/jacquesg/pdfium/issues

## See Also

- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
- [Installation Guide](/pdfium/installation/) — Setup instructions
- [Performance Guide](/pdfium/concepts/performance/) — Optimisation tips
