import { describe, it, expect } from 'vitest';
import { formatBytes, generateToken, cn } from '../utils';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats with custom decimals', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
  });
});

describe('generateToken', () => {
  it('generates a string of specified length', () => {
    expect(generateToken(16)).toHaveLength(16);
    expect(generateToken(32)).toHaveLength(32);
  });

  it('generates alphanumeric characters only', () => {
    const token = generateToken(100);
    expect(token).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('generates different tokens each time', () => {
    const token1 = generateToken(16);
    const token2 = generateToken(16);
    expect(token1).not.toBe(token2);
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar')).toBe('foo');
  });
});
