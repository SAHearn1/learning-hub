import { describe, it, expect } from 'vitest';
import { cn, formatDate, truncate } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind conflicts', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatDate', () => {
  it('formats a date in en-US short format', () => {
    const date = new Date('2025-01-15T00:00:00');
    const result = formatDate(date);
    expect(result).toBe('Jan 15, 2025');
  });

  it('formats another date correctly', () => {
    const date = new Date('2024-12-25T00:00:00');
    const result = formatDate(date);
    expect(result).toBe('Dec 25, 2024');
  });
});

describe('truncate', () => {
  it('truncates strings longer than the specified length', () => {
    expect(truncate('Hello, World!', 5)).toBe('Hello...');
  });

  it('does not truncate strings shorter than the limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('does not truncate strings equal to the limit', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('handles empty strings', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('handles zero length', () => {
    expect(truncate('Hello', 0)).toBe('...');
  });
});
