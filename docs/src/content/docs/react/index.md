---
title: React
description: React viewer documentation for usage, customization, architecture, and contributor standards.
---

# React

`@scaryterry/pdfium/react` provides a composable viewer stack with three layers:

- `PDFViewer` for high-level integration.
- `useViewerSetup` + slot components for custom layout control.
- Low-level hooks/components for full headless composition.

## Usage

- [PDFViewer](./pdf-viewer.md) — Compound viewer component and state surface.
- [Toolbar](./toolbar.md) — `DefaultToolbar` and headless `PDFToolbar` slot API.
- [useViewerSetup](./use-viewer-setup.md) — Orchestration hook for navigation/zoom/layout.
- [Examples](./examples.md) — End-to-end integration recipes.
- [Styling](./styling.md) — Theming and visual customization.

## Engineering

- [Architecture](./architecture.md) — Layer boundaries and design rules.
- [Architecture Map](./architecture-index.md) — Module-to-layer mapping.
- [Testing](./testing.md) — React test strategy and race coverage standards.
- [Contributor Playbook](./contributor-playbook.md) — Required file shapes and merge checks.
