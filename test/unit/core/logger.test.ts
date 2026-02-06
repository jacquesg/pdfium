import { describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, getLogger, SilentLogger, setLogger } from '../../../src/core/logger.js';

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    it('should delegate to console methods', () => {
      const logger = new ConsoleLogger();
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.debug('debug msg', 1);
      logger.info('info msg', 2);
      logger.warn('warn msg', 3);
      logger.error('error msg', 4);

      expect(debugSpy).toHaveBeenCalledWith('[PDFium] debug msg', 1);
      expect(infoSpy).toHaveBeenCalledWith('[PDFium] info msg', 2);
      expect(warnSpy).toHaveBeenCalledWith('[PDFium] warn msg', 3);
      expect(errorSpy).toHaveBeenCalledWith('[PDFium] error msg', 4);

      vi.restoreAllMocks();
    });
  });

  describe('SilentLogger', () => {
    it('should do nothing', () => {
      const logger = new SilentLogger();
      const debugSpy = vi.spyOn(console, 'debug');

      logger.debug('msg');
      logger.info('msg');
      logger.warn('msg');
      logger.error('msg');

      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('Global Logger Access', () => {
    it('should set and get logger', () => {
      const original = getLogger();
      const silent = new SilentLogger();

      setLogger(silent);
      expect(getLogger()).toBe(silent);

      setLogger(original);
      expect(getLogger()).toBe(original);
    });
  });
});
