'use client';

import type { JavaScriptAction } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useJavaScriptActions = createDocumentDataHook<JavaScriptAction[]>('javascriptActions', (doc) =>
  doc.getJavaScriptActions(),
);
