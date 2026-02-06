/**
 * RAII wrappers for PDFium C-structs.
 *
 * @module wasm/structs
 */

import { SIZEOF_FS_MATRIX, SIZEOF_FS_POINTF, SIZEOF_FS_QUADPOINTSF, SIZEOF_FS_RECTF } from '../internal/constants.js';
import type { WASMPointer } from '../internal/handles.js';
import type { WASMAllocation } from './allocation.js';
import { ptrOffset, type WASMMemoryManager } from './memory.js';

/**
 * Wrapper for FS_RECTF struct (4 floats).
 */
export class FSRectF {
  readonly #allocation: WASMAllocation;
  readonly #memory: WASMMemoryManager;

  constructor(memory: WASMMemoryManager) {
    this.#memory = memory;
    this.#allocation = memory.alloc(SIZEOF_FS_RECTF);
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  get left(): number {
    return this.#memory.readFloat32(this.#allocation.ptr);
  }
  set left(val: number) {
    this.#memory.writeFloat32(this.#allocation.ptr, val);
  }

  get top(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 4));
  }
  set top(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 4), val);
  }

  get right(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 8));
  }
  set right(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 8), val);
  }

  get bottom(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 12));
  }
  set bottom(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 12), val);
  }

  [Symbol.dispose](): void {
    this.#allocation[Symbol.dispose]();
  }
}

/**
 * Wrapper for FS_MATRIX struct (6 floats).
 */
export class FSMatrix {
  readonly #allocation: WASMAllocation;
  readonly #memory: WASMMemoryManager;

  constructor(memory: WASMMemoryManager) {
    this.#memory = memory;
    this.#allocation = memory.alloc(SIZEOF_FS_MATRIX);
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  get a(): number {
    return this.#memory.readFloat32(this.#allocation.ptr);
  }
  set a(val: number) {
    this.#memory.writeFloat32(this.#allocation.ptr, val);
  }

  get b(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 4));
  }
  set b(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 4), val);
  }

  get c(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 8));
  }
  set c(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 8), val);
  }

  get d(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 12));
  }
  set d(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 12), val);
  }

  get e(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 16));
  }
  set e(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 16), val);
  }

  get f(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 20));
  }
  set f(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 20), val);
  }

  [Symbol.dispose](): void {
    this.#allocation[Symbol.dispose]();
  }
}

/**
 * Wrapper for FS_POINTF struct (2 floats).
 */
export class FSPointF {
  readonly #allocation: WASMAllocation;
  readonly #memory: WASMMemoryManager;

  constructor(memory: WASMMemoryManager) {
    this.#memory = memory;
    this.#allocation = memory.alloc(SIZEOF_FS_POINTF);
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  get x(): number {
    return this.#memory.readFloat32(this.#allocation.ptr);
  }
  set x(val: number) {
    this.#memory.writeFloat32(this.#allocation.ptr, val);
  }

  get y(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 4));
  }
  set y(val: number) {
    this.#memory.writeFloat32(ptrOffset(this.#allocation.ptr, 4), val);
  }

  [Symbol.dispose](): void {
    this.#allocation[Symbol.dispose]();
  }
}

/**
 * Wrapper for FS_QUADPOINTSF struct (8 floats).
 */
export class FSQuadPointsF {
  readonly #allocation: WASMAllocation;
  readonly #memory: WASMMemoryManager;

  constructor(memory: WASMMemoryManager) {
    this.#memory = memory;
    this.#allocation = memory.alloc(SIZEOF_FS_QUADPOINTSF);
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  get x1(): number {
    return this.#memory.readFloat32(this.#allocation.ptr);
  }
  get y1(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 4));
  }
  get x2(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 8));
  }
  get y2(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 12));
  }
  get x3(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 16));
  }
  get y3(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 20));
  }
  get x4(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 24));
  }
  get y4(): number {
    return this.#memory.readFloat32(ptrOffset(this.#allocation.ptr, 28));
  }

  [Symbol.dispose](): void {
    this.#allocation[Symbol.dispose]();
  }
}
