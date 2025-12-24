'use client';

import React, { useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useStore, useActiveTab } from '@/store';

export default function VariablesEditor() {
  const settings = useStore((s) => s.settings);
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
        updateTab(activeTab.id, { variables: value });
      }
    },
    [activeTab, updateTab]
  );

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    // Define custom dark theme
    monaco.editor.defineTheme('graphit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: 'E84545' },
        { token: 'string.value.json', foreground: 'FFC7C7' },
        { token: 'number', foreground: 'FFE2E2' },
        { token: 'keyword', foreground: 'E84545' },
      ],
      colors: {
        'editor.background': '#2B2E4A',
        'editor.foreground': '#F6F6F6',
        'editor.lineHighlightBackground': '#53354A',
        'editor.selectionBackground': '#903749',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#888888',
        'editorLineNumber.activeForeground': '#E84545',
      },
    });

    // Define custom light theme
    monaco.editor.defineTheme('graphit-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: 'E84545' },
        { token: 'string.value.json', foreground: '903749' },
        { token: 'number', foreground: '53354A' },
        { token: 'keyword', foreground: 'E84545' },
      ],
      colors: {
        'editor.background': '#F6F6F6',
        'editor.foreground': '#2B2E4A',
        'editor.lineHighlightBackground': '#FFE2E2',
        'editor.selectionBackground': '#FFC7C7',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#AAAAAA',
        'editorLineNumber.activeForeground': '#E84545',
      },
    });

    monaco.editor.setTheme(settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light');
  }, [settings.theme]);

  if (!activeTab) return null;

  return (
    <div className="h-full w-full themed-bg">
      <Editor
        height="100%"
        language="json"
        theme={settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light'}
        value={activeTab.variables}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          fontSize: settings.editorFontSize,
          tabSize: settings.editorTabSize,
          minimap: { enabled: false },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          fontFamily: 'JetBrains Mono, monospace',
        }}
        loading={<div className="flex items-center justify-center h-full text-sm themed-bg">Loading...</div>}
      />
    </div>
  );
}
