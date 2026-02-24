import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

type BuildResult = {
  outputFiles?: Array<{ text: string }>;
};

type EsbuildModule = {
  build: (options: Record<string, unknown>) => Promise<BuildResult>;
};

function resolveEsbuildMainPath(): string {
  const pnpmStoreDir = join(process.cwd(), 'node_modules', '.pnpm');
  const candidates = readdirSync(pnpmStoreDir)
    .filter((entry) => entry.startsWith('esbuild@'))
    .sort();

  for (const candidate of candidates) {
    const mainPath = join(pnpmStoreDir, candidate, 'node_modules', 'esbuild', 'lib', 'main.js');
    if (existsSync(mainPath)) {
      return mainPath;
    }
  }

  throw new Error('Unable to locate esbuild in node_modules/.pnpm');
}

async function bundleReactExport(exportName: string): Promise<string> {
  const esbuildPath = resolveEsbuildMainPath();
  const esbuild = (await import(pathToFileURL(esbuildPath).href)) as EsbuildModule;

  const result = await esbuild.build({
    stdin: {
      contents: `import { ${exportName} } from './src/react.ts'; console.log(typeof ${exportName});`,
      resolveDir: process.cwd(),
      sourcefile: `bundle-${exportName}.ts`,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    treeShaking: true,
    write: false,
    logLevel: 'silent',
    define: {
      __DEV__: 'false',
      __WASM_HASH__: '"test-hash"',
      __PACKAGE_VERSION__: '"0.0.0-test"',
    },
  });

  return result.outputFiles?.[0]?.text ?? '';
}

function hasStaticNodeImport(source: string): boolean {
  return /\bfrom\s+['"]node:[^'"]+['"]/u.test(source) || /\bimport\(\s*['"]node:[^'"]+['"]\s*\)/u.test(source);
}

describe('react browser tree-shaking', () => {
  it('bundles useZoom from react entry without static node builtins', async () => {
    const output = await bundleReactExport('useZoom');
    expect(output.length).toBeGreaterThan(0);
    expect(hasStaticNodeImport(output)).toBe(false);
  });

  it('bundles usePDFiumInstance from react entry without static node builtins', async () => {
    const output = await bundleReactExport('usePDFiumInstance');
    expect(output.length).toBeGreaterThan(0);
    expect(hasStaticNodeImport(output)).toBe(false);
  });
});
