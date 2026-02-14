'use client';

import type { DocumentPermissions } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const usePermissions = createDocumentDataHook<DocumentPermissions>('permissions', (doc) => doc.getPermissions());
