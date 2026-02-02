/**
 * Ambient declarations for build-time constants.
 *
 * These constants are replaced by tsup/esbuild define during the build.
 * Centralised here to avoid repeating `declare const` in multiple files.
 *
 * @module env
 */

/** Whether the build targets development (enables diagnostics, warnings). */
declare const __DEV__: boolean;

/** Package version from package.json, injected at build time. */
declare const __PACKAGE_VERSION__: string;

/** SHA-256 hash of the bundled WASM binary, injected at build time. */
declare const __WASM_HASH__: string;
