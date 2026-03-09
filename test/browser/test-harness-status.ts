import type { HarnessRuntimeKind } from './harness-runtime.types.js';

export function getRequestedRuntimeKind(): HarnessRuntimeKind {
  const runtime = new URL(globalThis.location.href).searchParams.get('runtime');
  return runtime === 'main-thread' ? 'main-thread' : 'worker';
}

export function describeRuntimeKind(runtimeKind: HarnessRuntimeKind): string {
  return runtimeKind === 'worker' ? 'worker-backed' : 'main-thread';
}

export function updateStatus(message: string, isError: boolean): void {
  const statusEl = globalThis.document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'error' : 'success';
  }
}
