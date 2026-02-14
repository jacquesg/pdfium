'use client';

import { FormsPanelView } from '../../internal/forms-panel-view.js';
import { useFormsPanelController } from '../../internal/use-forms-panel-controller.js';

function FormsPanel() {
  return <FormsPanelView {...useFormsPanelController()} />;
}

export { FormsPanel };
