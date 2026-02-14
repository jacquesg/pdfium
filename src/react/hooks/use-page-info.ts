'use client';

import type { PageInfoResponse } from '../../context/protocol.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const usePageInfo = createPageDataHook<PageInfoResponse>('pageInfo', (page) => page.getPageInfo());
