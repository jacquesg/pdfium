'use client';

import type { Bookmark } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useBookmarks = createDocumentDataHook<Bookmark[]>('bookmarks', (doc) => doc.getBookmarks());
