# Documentation

This directory contains the Starlight/Astro docs site for `@scaryterry/pdfium`.

## Source Of Truth

- Author published documentation in `docs/src/content/docs/**`.
- `docs/src/content/docs/api/**` is generated (do not hand-edit).
- Do not place product docs in parallel trees (for example `docs/react/**`); they will not be published.

## Prerequisites

- Node.js 22+
- pnpm
- Repository dependencies installed (`pnpm install` from repo root)

## Local Development

Run from repository root:

```bash
pnpm --dir docs dev
```

This starts the docs dev server with hot reload.

## API Docs Generation

The API reference under `docs/src/content/docs/api/` is generated from TypeScript sources.
From repository root:

```bash
pnpm docs:gen
```

This runs TypeDoc and post-processes generated pages for Starlight consistency.

## Validation Commands

Run from repository root:

```bash
pnpm docs:build:strict
```

This performs:

- `docs` production build
- strict warning checks
- internal route link validation (`pnpm docs:check-links`)

Run docs-focused unit tests:

```bash
pnpm test -- test/unit/docs/*.test.ts
```

This enforces docs structure, frontmatter completeness, and TypeScript snippet syntax.

To run link checks only (requires an up-to-date `docs/dist` build):

```bash
pnpm docs:check-links
```

## Production Build

From repository root:

```bash
pnpm --dir docs build
pnpm --dir docs preview
```

`build` writes static output to `docs/dist/`.
