import type { ViewerPreferences } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useViewerPreferences = createDocumentDataHook<ViewerPreferences>('viewerPreferences', (doc) =>
  doc.getViewerPreferences(),
);
