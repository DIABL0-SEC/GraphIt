import { describe, it, expect } from 'vitest';
import {
  interpolateString,
  interpolateHeaders,
  interpolateAuth,
  extractVariableNames,
  buildInterpolationContext,
} from '@/lib/interpolation';
import type { Header, AuthConfig, EnvVariable } from '@/types';

describe('Interpolation', () => {
  const context = buildInterpolationContext([
    { id: '1', name: 'API_URL', value: 'https://api.example.com', isSecret: false },
    { id: '2', name: 'TOKEN', value: 'secret123', isSecret: true },
    { id: '3', name: 'PORT', value: 8080, isSecret: false },
    { id: '4', name: 'CONFIG', value: { key: 'value' }, isSecret: false },
  ]);

  describe('interpolateString', () => {
    it('replaces single variable', () => {
      expect(interpolateString('{{API_URL}}/graphql', context)).toBe(
        'https://api.example.com/graphql'
      );
    });

    it('replaces multiple variables', () => {
      expect(interpolateString('{{API_URL}}:{{PORT}}', context)).toBe(
        'https://api.example.com:8080'
      );
    });

    it('handles variables with spaces', () => {
      expect(interpolateString('{{ API_URL }}', context)).toBe(
        'https://api.example.com'
      );
    });

    it('leaves unknown variables unchanged', () => {
      expect(interpolateString('{{UNKNOWN}}', context)).toBe('{{UNKNOWN}}');
    });

    it('stringifies object values', () => {
      expect(interpolateString('{{CONFIG}}', context)).toBe('{"key":"value"}');
    });

    it('handles numeric values', () => {
      expect(interpolateString('Port: {{PORT}}', context)).toBe('Port: 8080');
    });

    it('returns empty string as-is', () => {
      expect(interpolateString('', context)).toBe('');
    });
  });

  describe('interpolateHeaders', () => {
    it('interpolates header keys and values', () => {
      const headers: Header[] = [
        { id: '1', key: 'Authorization', value: 'Bearer {{TOKEN}}', enabled: true },
        { id: '2', key: 'X-Api-Url', value: '{{API_URL}}', enabled: true },
      ];

      const result = interpolateHeaders(headers, context);

      expect(result[0].value).toBe('Bearer secret123');
      expect(result[1].value).toBe('https://api.example.com');
    });

    it('preserves enabled state', () => {
      const headers: Header[] = [
        { id: '1', key: 'Test', value: '{{TOKEN}}', enabled: false },
      ];

      const result = interpolateHeaders(headers, context);

      expect(result[0].enabled).toBe(false);
    });
  });

  describe('interpolateAuth', () => {
    it('interpolates bearer token', () => {
      const auth: AuthConfig = {
        mode: 'bearer',
        bearer: { token: '{{TOKEN}}' },
      };

      const result = interpolateAuth(auth, context);

      expect(result.bearer?.token).toBe('secret123');
    });

    it('interpolates basic auth', () => {
      const auth: AuthConfig = {
        mode: 'basic',
        basic: { username: 'user', password: '{{TOKEN}}' },
      };

      const result = interpolateAuth(auth, context);

      expect(result.basic?.password).toBe('secret123');
    });

    it('interpolates API key', () => {
      const auth: AuthConfig = {
        mode: 'api-key',
        apiKey: { key: 'X-Api-Key', value: '{{TOKEN}}', addTo: 'header' },
      };

      const result = interpolateAuth(auth, context);

      expect(result.apiKey?.value).toBe('secret123');
    });
  });

  describe('extractVariableNames', () => {
    it('extracts single variable', () => {
      expect(extractVariableNames('{{API_URL}}')).toEqual(['API_URL']);
    });

    it('extracts multiple variables', () => {
      expect(extractVariableNames('{{API_URL}}:{{PORT}}')).toEqual(['API_URL', 'PORT']);
    });

    it('deduplicates variables', () => {
      expect(extractVariableNames('{{API_URL}}/{{API_URL}}')).toEqual(['API_URL']);
    });

    it('returns empty array for no variables', () => {
      expect(extractVariableNames('no variables')).toEqual([]);
    });
  });
});
