import { describe, expect, it } from 'vitest';
import { AnnotationsPanel } from '../../../../../src/react/components/panels/annotations-panel.js';
import { LinksPanel } from '../../../../../src/react/components/panels/links-panel.js';
import { ObjectsPanel } from '../../../../../src/react/components/panels/objects-panel.js';
import { StructurePanel } from '../../../../../src/react/components/panels/structure-panel.js';
import { TextPanel } from '../../../../../src/react/components/panels/text-panel.js';
import { AnnotationsPanelRootView } from '../../../../../src/react/internal/annotations-panel-root-view.js';
import { LinksPanelView } from '../../../../../src/react/internal/links-panel-view.js';
import { ObjectsPanelRootView } from '../../../../../src/react/internal/objects-panel-root-view.js';
import { StructurePanelView } from '../../../../../src/react/internal/structure-panel-view.js';
import { TextPanelRootView } from '../../../../../src/react/internal/text-panel-root-view.js';

describe('panel wrapper contracts', () => {
  it('keeps links panel as a thin view export wrapper', () => {
    expect(LinksPanel).toBe(LinksPanelView);
  });

  it('keeps objects panel as a thin view export wrapper', () => {
    expect(ObjectsPanel).toBe(ObjectsPanelRootView);
  });

  it('keeps text panel as a thin view export wrapper', () => {
    expect(TextPanel).toBe(TextPanelRootView);
  });

  it('keeps annotations panel as a thin view export wrapper', () => {
    expect(AnnotationsPanel).toBe(AnnotationsPanelRootView);
  });

  it('keeps structure panel as a thin view export wrapper', () => {
    expect(StructurePanel).toBe(StructurePanelView);
  });
});
