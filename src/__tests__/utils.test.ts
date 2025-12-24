import { describe, it, expect } from 'vitest';
import {
  interpolate,
  formatBytes,
  formatDuration,
  parseJSON,
  maskSecret,
  generateOperationName,
  extractOperations,
  safeStringify,
} from '@/lib/utils';

describe('Utils', () => {
  describe('interpolate', () => {
    it('replaces variables', () => {
      expect(interpolate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('handles missing variables', () => {
      expect(interpolate('Hello {{name}}', {})).toBe('Hello {{name}}');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(50)).toBe('50ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(1500)).toBe('1.50s');
    });

    it('formats minutes', () => {
      expect(formatDuration(60000)).toBe('1.00m');
      expect(formatDuration(90000)).toBe('1.50m');
    });
  });

  describe('parseJSON', () => {
    it('parses valid JSON', () => {
      expect(parseJSON('{"a": 1}', {})).toEqual({ a: 1 });
    });

    it('returns fallback for invalid JSON', () => {
      expect(parseJSON('invalid', { default: true })).toEqual({ default: true });
    });
  });

  describe('maskSecret', () => {
    it('masks short secrets', () => {
      expect(maskSecret('abc')).toBe('****');
    });

    it('masks longer secrets', () => {
      expect(maskSecret('secret123')).toBe('se****23');
    });
  });

  describe('generateOperationName', () => {
    it('extracts operation name', () => {
      expect(generateOperationName('query GetUser { user { id } }')).toBe('GetUser');
    });

    it('returns null for anonymous', () => {
      expect(generateOperationName('{ user { id } }')).toBeNull();
    });
  });

  describe('extractOperations', () => {
    it('extracts multiple operations', () => {
      const query = `
        query GetUser { user { id } }
        mutation UpdateUser { updateUser { id } }
      `;
      expect(extractOperations(query)).toEqual(['GetUser', 'UpdateUser']);
    });
  });

  describe('safeStringify', () => {
    it('handles circular references', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect(() => safeStringify(obj)).not.toThrow();
      expect(safeStringify(obj)).toContain('[Circular]');
    });

    it('formats with spaces', () => {
      expect(safeStringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    });
  });
});
