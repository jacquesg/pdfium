import type { SerialisedFormWidget } from '../../context/protocol.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const useFormWidgets = createPageDataHook<SerialisedFormWidget[]>('formWidgets', (page) =>
  page.getFormWidgets(),
);
