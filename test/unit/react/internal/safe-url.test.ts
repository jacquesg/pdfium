import { describe, expect, it } from 'vitest';
import { isSafeUrl } from '../../../../src/react/internal/safe-url.js';

describe('isSafeUrl', () => {
  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('allows mailto URLs', () => {
    expect(isSafeUrl('mailto:user@example.com')).toBe(true);
  });

  it('allows tel URLs', () => {
    expect(isSafeUrl('tel:+441234567890')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isSafeUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('rejects vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:MsgBox("hi")')).toBe(false);
  });

  it('handles mixed-case schemes', () => {
    expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeUrl('JAVASCRIPT:void(0)')).toBe(false);
    expect(isSafeUrl('HTTPS://example.com')).toBe(true);
  });

  it('handles whitespace padding', () => {
    expect(isSafeUrl('  https://example.com  ')).toBe(true);
    expect(isSafeUrl('  javascript:alert(1)  ')).toBe(false);
  });

  it('allows relative URLs', () => {
    expect(isSafeUrl('./page.html')).toBe(true);
    expect(isSafeUrl('../docs/readme.html')).toBe(true);
    expect(isSafeUrl('page.html')).toBe(true);
  });

  it('allows fragment-only URLs', () => {
    expect(isSafeUrl('#section')).toBe(true);
    expect(isSafeUrl('#')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isSafeUrl('')).toBe(false);
  });

  it('rejects whitespace-only strings', () => {
    expect(isSafeUrl('   ')).toBe(false);
  });
});
