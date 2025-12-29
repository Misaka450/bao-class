/**
 * Test for Pro template utility functions
 */
import { describe, it, expect } from 'vitest';
import { formatErrorMessage, generateKey, debounce } from './pro';

describe('Pro Template Utilities', () => {
  it('should format error messages correctly', () => {
    expect(formatErrorMessage('Simple error')).toBe('Simple error');
    expect(formatErrorMessage({ message: 'Object error' })).toBe('Object error');
    expect(formatErrorMessage({})).toBe('操作失败，请稍后重试');
  });

  it('should generate unique keys', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^key_\d+_[a-z0-9]+$/);
  });

  it('should debounce function calls', (done) => {
    let callCount = 0;
    const debouncedFn = debounce(() => {
      callCount++;
    }, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    setTimeout(() => {
      expect(callCount).toBe(1);
      done();
    }, 150);
  });
});