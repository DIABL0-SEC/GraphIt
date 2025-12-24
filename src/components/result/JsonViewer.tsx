'use client';

import React, { useMemo } from 'react';
import { useStore } from '@/store';

interface JsonViewerProps {
  data: unknown;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  const settings = useStore((s) => s.settings);
  const isDark = settings.theme === 'dark';

  // Theme colors based on palette
  const colors = useMemo(() => ({
    key: '#E84545',
    string: isDark ? '#FFC7C7' : '#903749',
    number: isDark ? '#FFE2E2' : '#53354A',
    boolean: isDark ? '#FFC7C7' : '#903749',
    null: isDark ? '#888888' : '#AAAAAA',
    punctuation: isDark ? '#888888' : '#AAAAAA',
  }), [isDark]);

  // Format JSON with syntax highlighting
  const formattedJson = useMemo(() => {
    const jsonString = JSON.stringify(data, null, 2);
    if (!jsonString) return null;

    const lines = jsonString.split('\n');

    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let i = 0;
      let tokenKey = 0;

      while (i < line.length) {
        // Check for string (key or value)
        if (line[i] === '"') {
          const start = i;
          i++;
          while (i < line.length && (line[i] !== '"' || line[i - 1] === '\\')) {
            i++;
          }
          i++; // Include closing quote
          const str = line.slice(start, i);

          // Check if this is a key (followed by :)
          const remaining = line.slice(i).trimStart();
          const isKey = remaining.startsWith(':');

          tokens.push(
            <span
              key={tokenKey++}
              style={{ color: isKey ? colors.key : colors.string }}
            >
              {str}
            </span>
          );
          continue;
        }

        // Check for number
        if (/[0-9-]/.test(line[i])) {
          const start = i;
          while (i < line.length && /[0-9.eE+-]/.test(line[i])) {
            i++;
          }
          const num = line.slice(start, i);
          tokens.push(
            <span key={tokenKey++} style={{ color: colors.number }}>
              {num}
            </span>
          );
          continue;
        }

        // Check for boolean or null
        if (line.slice(i, i + 4) === 'true') {
          tokens.push(
            <span key={tokenKey++} style={{ color: colors.boolean }}>
              true
            </span>
          );
          i += 4;
          continue;
        }
        if (line.slice(i, i + 5) === 'false') {
          tokens.push(
            <span key={tokenKey++} style={{ color: colors.boolean }}>
              false
            </span>
          );
          i += 5;
          continue;
        }
        if (line.slice(i, i + 4) === 'null') {
          tokens.push(
            <span key={tokenKey++} style={{ color: colors.null }}>
              null
            </span>
          );
          i += 4;
          continue;
        }

        // Punctuation and whitespace
        tokens.push(
          <span key={tokenKey++} style={{ color: colors.punctuation }}>
            {line[i]}
          </span>
        );
        i++;
      }

      return (
        <div key={lineIndex} className="whitespace-pre-wrap break-all">
          {tokens}
        </div>
      );
    });
  }, [data, colors]);

  return (
    <div className="font-mono text-xs leading-relaxed overflow-hidden max-w-full">
      {formattedJson}
    </div>
  );
}
