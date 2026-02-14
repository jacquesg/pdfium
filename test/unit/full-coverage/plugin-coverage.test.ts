import { afterEach, describe, expect, it } from 'vitest';
import type { PDFiumPlugin } from '../../../src/core/plugin.js';
import { clearPlugins, getPlugins, registerPlugin } from '../../../src/core/plugin.js';

describe('Plugin system', () => {
  afterEach(() => {
    // Clean up after each test
    clearPlugins();
  });

  describe('clearPlugins', () => {
    it('should remove all registered plugins', () => {
      const plugin1: PDFiumPlugin = {
        name: 'TestPlugin1',
        onDocumentOpened: () => {},
      };

      const plugin2: PDFiumPlugin = {
        name: 'TestPlugin2',
        onDocumentOpened: () => {},
      };

      const plugin3: PDFiumPlugin = {
        name: 'TestPlugin3',
      };

      // Register multiple plugins
      registerPlugin(plugin1);
      registerPlugin(plugin2);
      registerPlugin(plugin3);

      // Verify they are registered
      expect(getPlugins()).toHaveLength(3);
      expect(getPlugins()[0]).toBe(plugin1);
      expect(getPlugins()[1]).toBe(plugin2);
      expect(getPlugins()[2]).toBe(plugin3);

      // Clear all plugins
      clearPlugins();

      // Verify the list is empty
      expect(getPlugins()).toHaveLength(0);
      expect(getPlugins()).toEqual([]);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      const plugin: PDFiumPlugin = {
        name: 'TestPlugin',
      };

      registerPlugin(plugin);
      expect(getPlugins()).toHaveLength(1);

      clearPlugins();
      expect(getPlugins()).toHaveLength(0);

      // Call again on empty list
      clearPlugins();
      expect(getPlugins()).toHaveLength(0);

      // Call a third time
      clearPlugins();
      expect(getPlugins()).toHaveLength(0);
    });

    it('should allow new plugins to be registered after clearing', () => {
      const plugin1: PDFiumPlugin = {
        name: 'First',
      };

      const plugin2: PDFiumPlugin = {
        name: 'Second',
      };

      registerPlugin(plugin1);
      expect(getPlugins()).toHaveLength(1);

      clearPlugins();
      expect(getPlugins()).toHaveLength(0);

      registerPlugin(plugin2);
      expect(getPlugins()).toHaveLength(1);
      expect(getPlugins()[0]).toBe(plugin2);
    });
  });

  describe('registerPlugin and getPlugins', () => {
    it('should register and retrieve plugins', () => {
      const plugin: PDFiumPlugin = {
        name: 'TestPlugin',
        onDocumentOpened: () => {},
      };

      registerPlugin(plugin);

      const plugins = getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]).toBe(plugin);
    });

    it('should maintain plugin order', () => {
      const plugin1: PDFiumPlugin = { name: 'Plugin1' };
      const plugin2: PDFiumPlugin = { name: 'Plugin2' };
      const plugin3: PDFiumPlugin = { name: 'Plugin3' };

      registerPlugin(plugin1);
      registerPlugin(plugin2);
      registerPlugin(plugin3);

      const plugins = getPlugins();
      expect(plugins[0]!.name).toBe('Plugin1');
      expect(plugins[1]!.name).toBe('Plugin2');
      expect(plugins[2]!.name).toBe('Plugin3');
    });

    it('should return readonly array', () => {
      const plugin: PDFiumPlugin = { name: 'Test' };
      registerPlugin(plugin);

      const plugins = getPlugins();

      // TypeScript enforces readonly, but verify the type
      expect(Array.isArray(plugins)).toBe(true);
    });
  });
});
