'use client';

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Wrench, PanelRightClose, PanelRight, GripVertical } from 'lucide-react';
import { useStore, useActiveTab } from '@/store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import RequestBar from '../editor/RequestBar';
import QueryEditor from '../editor/QueryEditor';
import VariablesEditor from '../editor/VariablesEditor';
import HeadersEditor from '../editor/HeadersEditor';
import AuthEditor from '../editor/AuthEditor';
import ScriptEditor from '../editor/ScriptEditor';
import EnvironmentEditor from '../editor/EnvironmentEditor';
import FileUploadEditor from '../editor/FileUploadEditor';
import SubscriptionPane from '../editor/SubscriptionPane';
import ResultPane from '../result/ResultPane';
import DocsExplorer from '../docs/DocsExplorer';
import QueryBuilder from '../builder/QueryBuilder';

export default function MainLayout() {
  const { t } = useTranslation();
  const rightPanelSection = useStore((s) => s.rightPanelSection);
  const setRightPanelSection = useStore((s) => s.setRightPanelSection);
  const showRightPanel = useStore((s) => s.showRightPanel);
  const toggleRightPanel = useStore((s) => s.toggleRightPanel);
  const activeTab = useActiveTab();

  // Resizable panel widths
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [editorWidth, setEditorWidth] = useState(50); // percentage

  const handleRun = useCallback(() => {
    // Trigger run from RequestBar - this is handled by keyboard shortcut in editor
  }, []);

  // Handle right panel resize
  const handleRightPanelResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 250), 600);
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  // Handle editor/result resize
  const handleEditorResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startPercent = editorWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - containerRect.left;
      const percent = (delta / containerRect.width) * 100;
      const newPercent = Math.min(Math.max(percent, 30), 70);
      setEditorWidth(newPercent);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [editorWidth]);

  return (
    <div className="h-screen flex themed-bg">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 border-r h-full themed-bg">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 themed-bg">
        <TabBar />
        <RequestBar />

        {/* Editor and Result - Side by Side */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Query Editor */}
          <div className="flex flex-col min-w-0" style={{ width: `${editorWidth}%` }}>
            <div className="flex-1 min-h-0">
              <QueryEditor onRun={handleRun} />
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={handleEditorResize}
          />

          {/* Right: Variables/Headers tabs + Result */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden themed-bg">
            {/* Tabbed Panels */}
            <div className="h-48 flex-shrink-0 border-b">
              <Tabs defaultValue="variables" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-9 px-2 flex-shrink-0 themed-bg">
                  <TabsTrigger value="variables" className="text-xs h-7">
                    {t('editor.variables')}
                  </TabsTrigger>
                  <TabsTrigger value="headers" className="text-xs h-7">
                    {t('editor.headers')}
                  </TabsTrigger>
                  <TabsTrigger value="auth" className="text-xs h-7">
                    {t('editor.auth')}
                  </TabsTrigger>
                  <TabsTrigger value="env" className="text-xs h-7">
                    Env
                  </TabsTrigger>
                  <TabsTrigger value="uploads" className="text-xs h-7">
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="pre-script" className="text-xs h-7">
                    Pre
                  </TabsTrigger>
                  <TabsTrigger value="post-script" className="text-xs h-7">
                    Post
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="text-xs h-7">
                    Sub
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="variables" className="flex-1 m-0 overflow-hidden themed-bg">
                  <VariablesEditor />
                </TabsContent>
                <TabsContent value="headers" className="flex-1 m-0 overflow-hidden themed-bg">
                  <HeadersEditor />
                </TabsContent>
                <TabsContent value="auth" className="flex-1 m-0 overflow-hidden themed-bg">
                  <AuthEditor />
                </TabsContent>
                <TabsContent value="env" className="flex-1 m-0 overflow-hidden themed-bg">
                  <EnvironmentEditor />
                </TabsContent>
                <TabsContent value="uploads" className="flex-1 m-0 overflow-hidden themed-bg">
                  <FileUploadEditor />
                </TabsContent>
                <TabsContent value="pre-script" className="flex-1 m-0 overflow-hidden themed-bg">
                  <ScriptEditor type="pre" />
                </TabsContent>
                <TabsContent value="post-script" className="flex-1 m-0 overflow-hidden themed-bg">
                  <ScriptEditor type="post" />
                </TabsContent>
                <TabsContent value="subscription" className="flex-1 m-0 overflow-hidden themed-bg">
                  <SubscriptionPane />
                </TabsContent>
              </Tabs>
            </div>

            {/* Result Panel */}
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden themed-bg">
              <ResultPane />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Docs/Builder */}
      {showRightPanel && (
        <>
          {/* Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0 transition-colors flex items-center justify-center"
            onMouseDown={handleRightPanelResize}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 hover:opacity-100" />
          </div>
          <div
            className="flex-shrink-0 border-l flex flex-col themed-bg"
            style={{ width: rightPanelWidth }}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b themed-panel">
              <div className="flex items-center gap-1">
                <Button
                  variant={rightPanelSection === 'docs' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7"
                  onClick={() => setRightPanelSection('docs')}
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  {t('docs.title')}
                </Button>
                <Button
                  variant={rightPanelSection === 'builder' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7"
                  onClick={() => setRightPanelSection('builder')}
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  {t('builder.title')}
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleRightPanel}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden themed-bg">
              {rightPanelSection === 'docs' && <DocsExplorer />}
              {rightPanelSection === 'builder' && <QueryBuilder />}
            </div>
          </div>
        </>
      )}

      {/* Right panel toggle button when closed */}
      {!showRightPanel && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-12 h-8 w-8"
          onClick={toggleRightPanel}
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
