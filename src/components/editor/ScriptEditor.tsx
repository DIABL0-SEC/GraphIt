'use client';

import React, { useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { useStore, useActiveTab } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface ScriptEditorProps {
  type: 'pre' | 'post';
}

export default function ScriptEditor({ type }: ScriptEditorProps) {
  const { t } = useTranslation();
  const settings = useStore((s) => s.settings);
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);
  const scriptLogs = useStore((s) => s.scriptLogs);
  const clearScriptLogs = useStore((s) => s.clearScriptLogs);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
        if (type === 'pre') {
          updateTab(activeTab.id, { preRequestScript: value });
        } else {
          updateTab(activeTab.id, { postRequestScript: value });
        }
      }
    },
    [activeTab, updateTab, type]
  );

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    // Define custom themes
    monaco.editor.defineTheme('graphit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'E84545' },
        { token: 'string', foreground: 'FFC7C7' },
        { token: 'number', foreground: 'FFE2E2' },
        { token: 'comment', foreground: '888888' },
      ],
      colors: {
        'editor.background': '#2B2E4A',
        'editor.foreground': '#F6F6F6',
        'editor.lineHighlightBackground': '#53354A',
        'editor.selectionBackground': '#903749',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#888888',
      },
    });

    monaco.editor.defineTheme('graphit-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'E84545' },
        { token: 'string', foreground: '903749' },
        { token: 'number', foreground: '53354A' },
        { token: 'comment', foreground: 'AAAAAA' },
      ],
      colors: {
        'editor.background': '#F6F6F6',
        'editor.foreground': '#2B2E4A',
        'editor.lineHighlightBackground': '#FFE2E2',
        'editor.selectionBackground': '#FFC7C7',
        'editorCursor.foreground': '#E84545',
        'editorLineNumber.foreground': '#AAAAAA',
      },
    });

    monaco.editor.setTheme(settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light');
  }, [settings.theme]);

  if (!activeTab) return null;

  const scriptValue = type === 'pre' ? activeTab.preRequestScript : activeTab.postRequestScript;

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="javascript"
          theme={settings.theme === 'dark' ? 'graphit-dark' : 'graphit-light'}
          value={scriptValue}
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
            fontFamily: 'JetBrains Mono, monospace',
          }}
          loading={<div className="flex items-center justify-center h-full text-sm themed-bg">Loading...</div>}
        />
      </div>

      <div className="border-t">
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50">
          <span className="text-xs font-medium">{t('scripts.console')}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearScriptLogs}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <ScrollArea className="h-24">
          <div className="p-2 font-mono text-xs space-y-1">
            {scriptLogs.length === 0 ? (
              <div className="text-muted-foreground">{t('scripts.help')}</div>
            ) : (
              scriptLogs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
