// src/lib/sanitize.ts
// Input sanitization utilities

/**
 * Strip HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize file names - remove path traversal, special chars
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim();
}

/**
 * Sanitize a URL to prevent XSS via javascript: protocol
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return '';
  }
  return url;
}

/**
 * Validate and sanitize text input (for comments, descriptions, etc.)
 */
export function sanitizeTextInput(input: string, maxLength = 1000): string {
  return sanitizeHtml(input).slice(0, maxLength).trim();
}

/**
 * Strip null bytes and control characters
 */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Full sanitize pipeline for user-supplied text
 */
export function sanitizeUserInput(input: string, maxLength = 1000): string {
  return stripControlChars(sanitizeTextInput(input, maxLength));
}
