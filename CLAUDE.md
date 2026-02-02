# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal PDFium WASM wrapper for Browser and Node.js. Provides a type-safe TypeScript API around the PDFium C++ library compiled to WebAssembly.

## Commands

```bash
pnpm build          # Build with tsup (ESM-only, ES2024 target)
pnpm test           # Run vitest tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage (thresholds: 80% lines, 75% branches, 85% functions)
pnpm test:mutation  # Run Stryker mutation tests (threshold: 50% break)
pnpm lint           # Lint with Biome
pnpm lint:fix       # Auto-fix lint issues
pnpm typecheck      # TypeScript check (strict mode)
pnpm check          # Run lint + typecheck + test
```

Run a single test file:
```bash
pnpm vitest run test/integration/page.test.ts
```

## Architecture

### Entry Points

The library has four entry points for different environments:

- `src/index.ts` - Main auto-detecting entry (re-exports everything)
- `src/browser.ts` - Browser-specific (requires explicit WASM binary)
- `src/node.ts` - Node.js-specific (auto-loads WASM from filesystem)
- `src/worker.ts` - Web Worker script for off-main-thread processing

### Module Structure

```
src/
├── core/           # Foundational utilities
│   ├── disposable.ts  # Symbol.dispose base class with FinalizationRegistry
│   ├── errors.ts      # Typed error classes with error codes (1xx-8xx ranges)
│   └── types.ts       # Branded types, handles, interfaces
├── document/       # PDF document handling
│   ├── document.ts    # PDFiumDocument - loaded document wrapper
│   ├── page.ts        # PDFiumPage - page rendering, text extraction
│   ├── builder.ts     # PDFiumDocumentBuilder - create PDFs from scratch
│   └── progressive.ts # Linearisation detection, incremental loading
├── wasm/           # WebAssembly interface
│   ├── bindings.ts    # PDFiumWASM interface - typed WASM function bindings
│   ├── loader.ts      # WASM loading (env detection, base64 fallback)
│   ├── memory.ts      # WASMMemoryManager - alloc/free, string encoding
│   └── allocation.ts  # RAII-style WASMAllocation with take() pattern
├── context/        # Worker proxy system
│   ├── worker-proxy.ts  # Main-thread proxy for off-thread operations
│   ├── worker-script.ts # Worker-side message handler
│   └── protocol.ts      # Request/response message types
└── vendor/         # Pre-compiled PDFium WASM binary
```

### Key Patterns

**Resource Management**: All resources implement `Symbol.dispose`. Use `using` keyword or explicit `dispose()`.

**WASM Memory**: The `WASMAllocation` class provides RAII-style memory management. Use `take()` to transfer ownership.

**Error Handling**: Typed error classes (`DocumentError`, `PageError`, `RenderError`, etc.) with numeric codes organised by category.

**Branded Types**: Handle types (`DocumentHandle`, `PageHandle`) are nominal types preventing misuse.

## Code Style

- **Biome** for linting/formatting (120 char lines, 2 spaces, single quotes, semicolons)
- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- **ESM-only** output targeting ES2024
- **Conventional commits** enforced via commitlint

## Testing

Tests live in `test/` mirroring `src/` structure:
- `test/core/` - Unit tests for disposable, errors
- `test/wasm/` - Unit tests for memory management, allocation
- `test/integration/` - Integration tests requiring actual WASM module
- `test/context/` - Worker proxy tests

Test fixtures (PDF files) are in `test/fixtures/`.
