'use client';

import type { SerialisedAnnotation } from '../../context/protocol.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const useAnnotations = createPageDataHook<SerialisedAnnotation[]>('annotations', (page) =>
  page.getAnnotations(),
);
