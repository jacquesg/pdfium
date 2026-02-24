import type { StructureElement } from '../../core/types.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const useStructureTree = createPageDataHook<StructureElement[] | null>('structureTree', (page) =>
  page.getStructureTree(),
);
