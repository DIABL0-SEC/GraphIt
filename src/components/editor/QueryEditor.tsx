'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useStore, useActiveTab, useActiveWorkspace, useActiveEnvironment } from '@/store';
import { prettifyQuery, minifyQuery, getOperationNames } from '@/lib/graphql';

interface QueryEditorProps {
  onRun?: () => void;
}

export default function QueryEditor({ onRun }: QueryEditorProps) {
  const settings = useStore((s) => s.settings);
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);
  const schemaCache = useStore((s) => s.schemaCache);
  const activeWorkspace = useActiveWorkspace();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const endpoint = activeTab?.useWorkspaceEndpoint
    ? activeWorkspace?.defaultEndpoint || ''
    : activeTab?.endpoint || '';

  const schema = schemaCache.get(endpoint);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom dark theme matching #2B2E4A, #E84545, #903749, #53354A
    monaco.editor.defineTheme('graphit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '888888', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'E84545', fontStyle: 'bold' },
        { token: 'string', foreground: 'FFC7C7' },
        { token: 'number', foreground: 'FFE2E2' },
        { token: 'variable', foreground: 'E84545' },
        { token: 'annotation', foreground: '903749' },
        { token: 'identifier', foreground: 'F6F6F6' },
        { token: 'operator', foreground: 'AAAAAA' },
        { token: 'delimiter', foreground: 'AAAAAA' },
      ],
      colors: {
        'editor.background': '#2B2E4A',
        'editor.foreground': '#F6F6F6',
        'editor.lineHighlightBackground': '#53354A',
        'editor.selectionBackground': '#903749',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#888888',
        'editorLineNumber.activeForeground': '#E84545',
        'editor.selectionHighlightBackground': '#90374950',
        'editorIndentGuide.background': '#53354A',
        'editorIndentGuide.activeBackground': '#903749',
      },
    });

    // Define custom light theme matching #F6F6F6, #FFE2E2, #FFC7C7, #AAAAAA
    monaco.editor.defineTheme('graphit-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '888888', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'E84545', fontStyle: 'bold' },
        { token: 'string', foreground: '903749' },
        { token: 'number', foreground: '53354A' },
        { token: 'variable', foreground: 'E84545' },
        { token: 'annotation', foreground: '903749' },
        { token: 'identifier', foreground: '2B2E4A' },
        { token: 'operator', foreground: '53354A' },
        { token: 'delimiter', foreground: '53354A' },
      ],
      colors: {
        'editor.background': '#F6F6F6',
        'editor.foreground': '#2B2E4A',
        'editor.lineHighlightBackground': '#FFE2E2',
        'editor.selectionBackground': '#FFC7C7',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#AAAAAA',
        'editorLineNumber.activeForeground': '#E84545',
        'editor.selectionHighlightBackground': '#FFC7C750',
        'editorIndentGuide.background': '#DDDDDD',
        'editorIndentGuide.activeBackground': '#AAAAAA',
      },
    });

    // Apply the theme
    monaco.editor.setTheme(settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light');

    // Register GraphQL language if not registered
    if (!monaco.languages.getLanguages().some((lang) => lang.id === 'graphql')) {
      monaco.languages.register({ id: 'graphql' });

      // Basic GraphQL syntax highlighting
      monaco.languages.setMonarchTokensProvider('graphql', {
        keywords: [
          'query',
          'mutation',
          'subscription',
          'fragment',
          'on',
          'type',
          'interface',
          'union',
          'enum',
          'input',
          'scalar',
          'extends',
          'implements',
          'directive',
          'schema',
          'true',
          'false',
          'null',
        ],
        operators: ['=', '!', '?', ':', '&', '|'],
        symbols: /[=!?:&|]+/,
        tokenizer: {
          root: [
            [/#.*$/, 'comment'],
            [/"([^"\\]|\\.)*"/, 'string'],
            [/"""[\s\S]*?"""/, 'string'],
            [/\$[a-zA-Z_]\w*/, 'variable'],
            [/@[a-zA-Z_]\w*/, 'annotation'],
            [
              /[a-zA-Z_]\w*/,
              {
                cases: {
                  '@keywords': 'keyword',
                  '@default': 'identifier',
                },
              },
            ],
            [/[{}()\[\]]/, '@brackets'],
            [/@symbols/, 'operator'],
            [/\d+/, 'number'],
            [/[,:]/, 'delimiter'],
          ],
        },
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      const value = editor.getValue();
      const prettified = prettifyQuery(value);
      if (prettified !== value) {
        editor.setValue(prettified);
      }
    });

    // Configure editor
    editor.updateOptions({
      fontSize: settings.editorFontSize,
      tabSize: settings.editorTabSize,
      minimap: { enabled: settings.editorMinimap },
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });
  }, [onRun, settings]);

  // Update editor settings when they change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.editorFontSize,
        tabSize: settings.editorTabSize,
        minimap: { enabled: settings.editorMinimap },
      });
    }
  }, [settings.editorFontSize, settings.editorTabSize, settings.editorMinimap]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
        updateTab(activeTab.id, { query: value });
      }
    },
    [activeTab, updateTab]
  );

  if (!activeTab) return null;

  return (
    <div className="h-full w-full themed-bg">
      <Editor
        height="100%"
        language="graphql"
        theme={settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light'}
        value={activeTab.query}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          fontSize: settings.editorFontSize,
          tabSize: settings.editorTabSize,
          minimap: { enabled: settings.editorMinimap },
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
        loading={<div className="flex items-center justify-center h-full themed-bg">Loading editor...</div>}
      />
    </div>
  );
}
