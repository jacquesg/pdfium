import { describe, expect, it } from 'vitest';
import type { SerialisedFormWidget } from '../../../../src/context/protocol.js';
import { FlattenResult, FormFieldType } from '../../../../src/core/types.js';
import { FORMS_PANEL_COPY } from '../../../../src/react/internal/forms-panel-copy.js';
import {
  buildWidgetDetailRows,
  flattenResultStyle,
  parseHexColour,
} from '../../../../src/react/internal/forms-panel-helpers.js';

describe('forms-panel helpers', () => {
  it('parses hex colour channels', () => {
    expect(parseHexColour('#112233')).toEqual({ r: 17, g: 34, b: 51 });
  });

  it('returns themed styles for flatten result states', () => {
    expect(flattenResultStyle(FlattenResult.Success).backgroundColor).toContain('success');
    expect(flattenResultStyle(FlattenResult.NothingToDo).backgroundColor).toContain('warning');
    expect(flattenResultStyle(FlattenResult.Fail).backgroundColor).toContain('error');
  });

  it('builds stable widget-detail rows', () => {
    const widget: SerialisedFormWidget = {
      annotationIndex: 7,
      fieldName: 'email',
      fieldType: FormFieldType.Unknown,
      fieldValue: 'a@example.com',
    };
    expect(buildWidgetDetailRows(widget)).toEqual([
      { label: FORMS_PANEL_COPY.fieldLabel, value: 'email' },
      { label: FORMS_PANEL_COPY.typeLabel, value: FormFieldType.Unknown },
      { label: FORMS_PANEL_COPY.valueLabel, value: 'a@example.com' },
      { label: FORMS_PANEL_COPY.annotationIndexLabel, value: 7 },
    ]);
  });
});
