import { describe, expect, it } from 'vitest';
import {
  formatJavaScriptActionHeading,
  formatPermissionsRaw,
  formatSignatureHeading,
  INFO_PANEL_COPY,
} from '../../../../src/react/internal/info-panel-copy.js';

describe('info-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(INFO_PANEL_COPY.emptyStateMessage).toBe('Load a PDF to inspect its metadata and properties.');
    expect(INFO_PANEL_COPY.loadingMessage).toBe('Loading...');
    expect(INFO_PANEL_COPY.permissionsSectionTitle).toBe('Permissions');
    expect(INFO_PANEL_COPY.noSignaturesMessage).toBe('No signatures found');
    expect(INFO_PANEL_COPY.noJavaScriptActionsMessage).toBe('No JavaScript actions found');
  });

  it('formats dynamic labels', () => {
    expect(formatSignatureHeading(3)).toBe('Signature #3');
    expect(formatJavaScriptActionHeading(2, '')).toBe('Action #2');
    expect(formatJavaScriptActionHeading(4, 'OpenAction')).toBe('OpenAction');
    expect(formatPermissionsRaw(0xff, 5)).toBe('Raw: 0xFF • Security Rev: 5');
  });
});
