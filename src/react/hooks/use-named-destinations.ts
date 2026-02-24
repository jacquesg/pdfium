import type { NamedDestination } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useNamedDestinations = createDocumentDataHook<NamedDestination[]>('namedDestinations', (doc) =>
  doc.getNamedDestinations(),
);
