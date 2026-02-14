'use client';

import type { SerialisedLink } from '../../context/protocol.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const useLinks = createPageDataHook<SerialisedLink[]>('links', (page) => page.getLinks());
