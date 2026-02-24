import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { defineConfig } from 'tsup';
import ts from 'typescript';

const wasmPath = 'src/vendor/pdfium.wasm';
const wasmExists = existsSync(wasmPath);
const wasmHash = wasmExists
  ? createHash('sha256').update(readFileSync(wasmPath)).digest('hex').slice(0, 8)
  : 'development';

function applyCommonEsbuildOptions(opts: { legalComments?: string; charset?: string }) {
  opts.legalComments = 'none';
  opts.charset = 'utf8';
}

function copyVendorArtifacts() {
  mkdirSync('dist/vendor', { recursive: true });
  if (wasmExists) {
    copyFileSync(wasmPath, 'dist/vendor/pdfium.wasm');
    console.log('Copied WASM binary to dist/vendor/');
  }
  // Copy CJS glue code - must not be bundled (contains require('fs'))
  const cjsPath = 'src/vendor/pdfium.cjs';
  if (existsSync(cjsPath)) {
    copyFileSync(cjsPath, 'dist/vendor/pdfium.cjs');
    console.log('Copied CJS glue code to dist/vendor/');
  }
  // Copy factory wrapper for browser environments
  const factoryPath = 'src/vendor/pdfium-factory.mjs';
  if (existsSync(factoryPath)) {
    copyFileSync(factoryPath, 'dist/vendor/pdfium-factory.mjs');
    console.log('Copied factory wrapper to dist/vendor/');
  }
}

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) continue;
      if (fullPath.endsWith('.d.ts')) continue;
      files.push(fullPath);
    }
  }

  return files.sort();
}

function hasRuntimeOutput(filePath: string): boolean {
  const source = readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      preserveValueImports: false,
      removeComments: true,
    },
  }).outputText;

  const stripped = transpiled
    .replace(/^['"]use strict['"];?\s*/u, '')
    .replace(/\/\*[\s\S]*?\*\//gmu, '')
    .replace(/^\s*\/\/.*$/gmu, '')
    .replace(/\/\/# sourceMappingURL=.*$/gmu, '')
    .replace(/^\s*export\s*\{\s*\};?\s*$/gmu, '')
    .trim();

  return stripped !== '';
}

function resolveSourceModule(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolvedBase = resolve(dirname(fromFile), specifier);
  const candidates: string[] = [];

  if (specifier.endsWith('.js')) {
    const baseWithoutJs = resolvedBase.slice(0, -3);
    candidates.push(`${baseWithoutJs}.ts`, `${baseWithoutJs}.tsx`);
  } else {
    candidates.push(`${resolvedBase}.ts`, `${resolvedBase}.tsx`);
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectRuntimeReexportTargets(initialEntries: string[]): string[] {
  const included = new Set(initialEntries);
  const queue = [...initialEntries];

  while (queue.length > 0) {
    const filePath = queue.pop();
    if (!filePath) continue;

    const source = ts.createSourceFile(
      filePath,
      readFileSync(filePath, 'utf8'),
      ts.ScriptTarget.ESNext,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement) || statement.isTypeOnly || statement.moduleSpecifier === undefined) {
        continue;
      }

      const specifier = statement.moduleSpecifier;
      if (!ts.isStringLiteralLike(specifier)) continue;
      const target = resolveSourceModule(filePath, specifier.text);
      if (!target || included.has(target)) continue;

      included.add(target);
      queue.push(target);
    }
  }

  return [...included].sort();
}

const runtimeEntries = collectRuntimeReexportTargets(collectSourceFiles('src').filter(hasRuntimeOutput));

export default defineConfig((options) => [
  {
    entry: runtimeEntries,
    format: ['esm'],
    target: 'es2024',
    platform: 'neutral',
    bundle: false,
    dts: true,
    sourcemap: !options.watch,
    clean: true,
    splitting: false,
    treeshake: {
      preset: 'recommended',
    },
    minify: !options.watch && process.env.NODE_ENV === 'production',
    external: [
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
      'node:crypto',
      'node:worker_threads',
      'module',
      'fs',
      'path',
      'crypto',
      'worker_threads',
      'react',
      'react/jsx-runtime',
      'react-dom',
    ],
    define: {
      __PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
      __WASM_HASH__: JSON.stringify(wasmHash),
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
    esbuildOptions(opts) {
      applyCommonEsbuildOptions(opts);
    },
    async onSuccess() {
      copyVendorArtifacts();
    },
  },
]);
