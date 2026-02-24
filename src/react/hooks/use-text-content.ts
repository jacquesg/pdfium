import { createPageDataHook } from '../internal/create-data-hook.js';

export const useTextContent = createPageDataHook<{ text: string; rects: Float32Array }>('textContent', (page) =>
  page.getTextLayout(),
);
