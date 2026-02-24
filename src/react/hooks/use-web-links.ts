import type { WebLink } from '../../core/types.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const useWebLinks = createPageDataHook<WebLink[]>('webLinks', (page) => page.getWebLinks());
