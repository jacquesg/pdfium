import { describe, expect, it } from 'vitest';
import { sanitiseFilename } from '../../../../src/react/internal/sanitise-filename.js';

describe('sanitiseFilename', () => {
  it('passes through safe filenames', () => {
    expect(sanitiseFilename('document.pdf')).toBe('document.pdf');
    expect(sanitiseFilename('my-report_2024.pdf')).toBe('my-report_2024.pdf');
  });

  it('strips path traversal sequences', () => {
    // Separators are stripped first, then `..` sequences, so intermediate segments remain
    expect(sanitiseFilename('../../etc/passwd')).toBe('etcpasswd');
    expect(sanitiseFilename('../secret.pdf')).toBe('secret.pdf');
  });

  it('strips leading dots', () => {
    expect(sanitiseFilename('.hidden')).toBe('hidden');
    expect(sanitiseFilename('..bashrc')).toBe('bashrc');
    expect(sanitiseFilename('...triple')).toBe('triple');
  });

  it('replaces null bytes', () => {
    expect(sanitiseFilename('file\0name.pdf')).toBe('filename.pdf');
    expect(sanitiseFilename('\0\0test.pdf')).toBe('test.pdf');
  });

  it('strips forward slash directory separators', () => {
    expect(sanitiseFilename('dir/file.pdf')).toBe('dirfile.pdf');
    expect(sanitiseFilename('/etc/passwd')).toBe('etcpasswd');
  });

  it('strips backslash directory separators', () => {
    expect(sanitiseFilename('dir\\file.pdf')).toBe('dirfile.pdf');
    expect(sanitiseFilename('C:\\Users\\doc.pdf')).toBe('C:Usersdoc.pdf');
  });

  it('returns fallback for empty result', () => {
    expect(sanitiseFilename('')).toBe('download');
    expect(sanitiseFilename('...')).toBe('download');
    expect(sanitiseFilename('/')).toBe('download');
    expect(sanitiseFilename('   ')).toBe('download');
  });

  it('preserves Unicode filenames', () => {
    expect(sanitiseFilename('rapport-annuel-2024.pdf')).toBe('rapport-annuel-2024.pdf');
    expect(sanitiseFilename('\u6587\u66F8.pdf')).toBe('\u6587\u66F8.pdf');
    expect(sanitiseFilename('\u00E9l\u00E8ve-r\u00E9sum\u00E9.pdf')).toBe('\u00E9l\u00E8ve-r\u00E9sum\u00E9.pdf');
  });
});
