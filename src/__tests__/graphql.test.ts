import { describe, it, expect } from 'vitest';
import {
  parseQuery,
  prettifyQuery,
  minifyQuery,
  getOperationNames,
  getOperationType,
} from '@/lib/graphql';

describe('GraphQL Utilities', () => {
  describe('parseQuery', () => {
    it('parses valid query', () => {
      const query = `query GetUser { user { id name } }`;
      const result = parseQuery(query);
      expect(result).not.toBeNull();
      expect(result?.definitions).toHaveLength(1);
    });

    it('returns null for invalid query', () => {
      const query = `query { invalid`;
      const result = parseQuery(query);
      expect(result).toBeNull();
    });
  });

  describe('prettifyQuery', () => {
    it('formats compact query', () => {
      const query = `query GetUser{user{id name}}`;
      const result = prettifyQuery(query);
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    it('returns original for invalid query', () => {
      const query = `invalid {`;
      const result = prettifyQuery(query);
      expect(result).toBe(query);
    });
  });

  describe('minifyQuery', () => {
    it('removes extra whitespace', () => {
      const query = `query GetUser {
        user {
          id
          name
        }
      }`;
      const result = minifyQuery(query);
      expect(result).not.toContain('\n');
      expect(result).toBe('query GetUser{user{id name}}');
    });
  });

  describe('getOperationNames', () => {
    it('extracts single operation name', () => {
      const query = `query GetUser { user { id } }`;
      expect(getOperationNames(query)).toEqual(['GetUser']);
    });

    it('extracts multiple operation names', () => {
      const query = `
        query GetUser { user { id } }
        mutation UpdateUser { updateUser { id } }
      `;
      expect(getOperationNames(query)).toEqual(['GetUser', 'UpdateUser']);
    });

    it('returns empty for anonymous operations', () => {
      const query = `query { user { id } }`;
      expect(getOperationNames(query)).toEqual([]);
    });

    it('returns empty for invalid query', () => {
      const query = `invalid`;
      expect(getOperationNames(query)).toEqual([]);
    });
  });

  describe('getOperationType', () => {
    it('identifies query', () => {
      const query = `query GetUser { user { id } }`;
      expect(getOperationType(query)).toBe('query');
    });

    it('identifies mutation', () => {
      const query = `mutation UpdateUser { updateUser { id } }`;
      expect(getOperationType(query)).toBe('mutation');
    });

    it('identifies subscription', () => {
      const query = `subscription OnUserUpdated { userUpdated { id } }`;
      expect(getOperationType(query)).toBe('subscription');
    });

    it('returns null for invalid query', () => {
      const query = `invalid`;
      expect(getOperationType(query)).toBeNull();
    });

    it('finds specific operation by name', () => {
      const query = `
        query GetUser { user { id } }
        mutation UpdateUser { updateUser { id } }
      `;
      expect(getOperationType(query, 'UpdateUser')).toBe('mutation');
    });
  });
});
