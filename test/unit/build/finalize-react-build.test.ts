import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { finalizeReactBuild } from '../../../scripts/finalize-react-build.js';

describe('finalizeReactBuild', () => {
  it('overwrites dist/react.js with a use-client wrapper', () => {
    const root = mkdtempSync(join(tmpdir(), 'pdfium-finalize-react-'));
    const distDir = join(root, 'dist');
    mkdirSync(distDir);
    writeFileSync(join(distDir, 'react.js'), "export * from './react/index.js';\n", 'utf8');

    finalizeReactBuild(distDir);

    expect(readFileSync(join(distDir, 'react.js'), 'utf8')).toBe("'use client';\nexport * from './react/index.js';\n");
  });

  it('does nothing when dist/react.js does not exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'pdfium-finalize-react-'));
    const distDir = join(root, 'dist');
    mkdirSync(distDir);

    finalizeReactBuild(distDir);

    expect(existsSync(join(distDir, 'react.js'))).toBe(false);
  });
});
