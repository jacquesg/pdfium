import { describe, expect, it } from 'vitest';
import { clearPlugins, getPlugins, type PDFiumPlugin, registerPlugin } from '../../../src/core/plugin.js';

describe('Plugin System', () => {
  it('should register and retrieve plugins', () => {
    const plugin: PDFiumPlugin = {
      name: 'test-plugin',
      onDocumentOpened: () => {},
    };

    registerPlugin(plugin);
    expect(getPlugins()).toContain(plugin);
  });

  it('clearPlugins should remove all registered plugins', () => {
    registerPlugin({ name: 'plugin-a' });
    registerPlugin({ name: 'plugin-b' });
    expect(getPlugins().length).toBeGreaterThanOrEqual(2);

    clearPlugins();
    expect(getPlugins()).toHaveLength(0);
  });
});
