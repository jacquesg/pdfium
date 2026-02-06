import { describe, expect, it } from 'vitest';
import { getPlugins, type PDFiumPlugin, registerPlugin } from '../../../src/core/plugin.js';

describe('Plugin System', () => {
  it('should register and retrieve plugins', () => {
    const plugin: PDFiumPlugin = {
      name: 'test-plugin',
      onDocumentOpened: () => {},
    };

    registerPlugin(plugin);
    expect(getPlugins()).toContain(plugin);
  });
});
