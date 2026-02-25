# Docs Voice Guide

This repository treats documentation as product surface, not an afterthought.

## Goals

- Help readers get a working result quickly.
- Remove ambiguity around runtime setup, worker wiring, and WASM assets.
- Keep language direct, practical, and human.

## Writing Rules

1. Start with intent.
2. Use task-first flow: setup, steps, verify, then troubleshooting.
3. Prefer concrete wording over generic phrasing.
4. Keep examples copy-paste-safe and executable.
5. Make failure modes explicit where setup is error-prone.

## Avoid

- Repetitive openers such as "This page targets..." or "This guide covers..." on every page.
- Abstract statements without an actionable next step.
- Hiding required runtime setup details deep in long sections.

## Page Template

Use this shape for high-traffic pages:

1. "What you will build" (or equivalent)
2. Prerequisites
3. Step-by-step setup
4. Verify section
5. Common errors / troubleshooting
6. Next links

## Quality Gate

Before merging docs changes:

1. Run `pnpm test -- test/unit/docs/*.test.ts`
2. Run `pnpm docs:build:strict`
3. Confirm links with `pnpm docs:check-links` (already part of strict build)
