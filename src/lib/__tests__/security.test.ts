import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeHtml,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeTextInput,
  stripControlChars,
  sanitizeUserInput,
} from '../sanitize';
import { checkRateLimit, RATE_LIMITS } from '../rate-limit';
import { hasSuspiciousPattern } from '../api-security';

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('strips HTML tags', () => {
      expect(sanitizeHtml('<b>bold</b>')).toBe('bold');
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('escapes special characters', () => {
      expect(sanitizeHtml('a & b')).toBe('a &amp; b');
      expect(sanitizeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });
  });

  describe('sanitizeFileName', () => {
    it('removes path traversal', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('etcpasswd');
    });

    it('removes special chars', () => {
      expect(sanitizeFileName('file<>:"|?*.txt')).toBe('file.txt');
    });

    it('keeps normal names', () => {
      expect(sanitizeFileName('my document.pdf')).toBe('my document.pdf');
    });
  });

  describe('sanitizeUrl', () => {
    it('blocks javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('blocks data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>')).toBe('');
    });

    it('allows normal URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('sanitizeTextInput', () => {
    it('truncates to max length', () => {
      expect(sanitizeTextInput('a'.repeat(2000), 100)).toHaveLength(100);
    });

    it('strips HTML and trims', () => {
      expect(sanitizeTextInput('  <b>hello</b>  ')).toBe('hello');
    });
  });

  describe('stripControlChars', () => {
    it('removes null bytes and control chars', () => {
      expect(stripControlChars('hello\x00world')).toBe('helloworld');
      expect(stripControlChars('test\x1ftext')).toBe('testtext');
    });

    it('preserves normal text', () => {
      expect(stripControlChars('normal text')).toBe('normal text');
    });
  });

  describe('sanitizeUserInput', () => {
    it('does full pipeline', () => {
      const result = sanitizeUserInput('<script>alert(1)</script> hello\x00', 100);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('\x00');
      expect(result).toBe('alert(1) hello');
    });
  });
});

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const result = checkRateLimit('test-key', { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over limit', () => {
    const key = 'test-block';
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { windowMs: 60_000, maxRequests: 5 });
    }
    const result = checkRateLimit(key, { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window', () => {
    const key = 'test-reset';
    const config = { windowMs: 60_000, maxRequests: 2 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    const after = checkRateLimit(key, config);
    expect(after.allowed).toBe(true);
  });

  it('has correct preset configs', () => {
    expect(RATE_LIMITS.auth.maxRequests).toBe(10);
    expect(RATE_LIMITS.api.maxRequests).toBe(100);
    expect(RATE_LIMITS.upload.maxRequests).toBe(20);
  });
});

describe('hasSuspiciousPattern', () => {
  it('detects path traversal', () => {
    expect(hasSuspiciousPattern('../../etc/passwd')).toBe(true);
  });

  it('detects null bytes', () => {
    expect(hasSuspiciousPattern('test\x00value')).toBe(true);
  });

  it('detects XSS', () => {
    expect(hasSuspiciousPattern('<script>alert(1)</script>')).toBe(true);
  });

  it('detects SQL injection', () => {
    expect(hasSuspiciousPattern('1 UNION SELECT * FROM users')).toBe(true);
  });

  it('allows normal text', () => {
    expect(hasSuspiciousPattern('Hello world')).toBe(false);
    expect(hasSuspiciousPattern('file_name-123.pdf')).toBe(false);
  });
});
