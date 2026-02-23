import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

function withTempDir<T>(run: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'pdfium-standalone-test-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function generateStandalone(demo: 'node' | 'plain' | 'vite', targetDir: string): void {
  execFileSync('node', ['--import', 'tsx', 'demo/scripts/make-standalone.ts', demo, targetDir], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
}

describe('make-standalone docs templates', () => {
  test('plain demo README uses shipped dist/vendor pdfium.cjs path', () => {
    withTempDir((dir) => {
      const out = join(dir, 'plain');
      generateStandalone('plain', out);

      const readme = readFileSync(join(out, 'README.md'), 'utf8');
      expect(readme).toContain('node_modules/@scaryterry/pdfium/dist/vendor/pdfium.cjs');
      expect(readme).not.toContain('node_modules/@scaryterry/pdfium/src/vendor/pdfium.cjs');
      expect(readme).toContain('https://github.com/jacquesg/pdfium');
      expect(readme).not.toContain('https://github.com/nickadam/pdfium');
    });
  });

  test('vite standalone setup script loads pdfium.cjs from dist/vendor', () => {
    withTempDir((dir) => {
      const out = join(dir, 'vite');
      generateStandalone('vite', out);

      const setupScript = readFileSync(join(out, 'setup.mjs'), 'utf8');
      expect(setupScript).toContain("'dist', 'vendor', 'pdfium.cjs'");
      expect(setupScript).not.toContain("'src', 'vendor', 'pdfium.cjs'");

      const readme = readFileSync(join(out, 'README.md'), 'utf8');
      expect(readme).toContain('https://github.com/jacquesg/pdfium');
      expect(readme).not.toContain('https://github.com/nickadam/pdfium');
    });
  });
});
