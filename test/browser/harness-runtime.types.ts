export type HarnessRuntimeKind = 'worker' | 'main-thread';

export interface HarnessSnapshot {
  readonly runtimeKind: HarnessRuntimeKind;
  readonly isReady: boolean;
  readonly isSettled: boolean;
  readonly error: string | null;
  readonly errorStack: string | null;
  readonly statusMessage: string;
  readonly statusText: string;
}
