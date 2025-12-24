'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Trash2, Check } from 'lucide-react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatBytes, formatDuration, downloadFile, safeStringify } from '@/lib/utils';
import { cn } from '@/lib/utils';
import JsonViewer from './JsonViewer';

export default function ResultPane() {
  const { t } = useTranslation();
  const requestLoading = useStore((s) => s.requestLoading);
  const requestResult = useStore((s) => s.requestResult);
  const clearResult = useStore((s) => s.clearResult);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!requestResult?.response) return;
    await navigator.clipboard.writeText(safeStringify(requestResult.response, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!requestResult?.response) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(
      safeStringify(requestResult.response, 2),
      `graphit-response-${timestamp}.json`
    );
  };

  const handleDownloadBundle = () => {
    if (!requestResult) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundle = {
      response: requestResult.response,
      headers: requestResult.headers,
      stats: requestResult.stats,
    };
    downloadFile(
      safeStringify(bundle, 2),
      `graphit-bundle-${timestamp}.json`
    );
  };

  if (requestLoading) {
    return (
      <div className="h-full flex items-center justify-center themed-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!requestResult) {
    return (
      <div className="h-full flex items-center justify-center themed-bg">
        <p className="text-sm text-muted-foreground">{t('response.noResponse')}</p>
      </div>
    );
  }

  if (requestResult.error) {
    return (
      <div className="h-full flex flex-col themed-bg">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium text-destructive">{t('common.error')}</span>
          <Button variant="ghost" size="icon" onClick={clearResult}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">
              {requestResult.error}
            </pre>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col themed-bg overflow-hidden">
      <Tabs defaultValue="body" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-2 border-b">
          <TabsList className="h-9">
            <TabsTrigger value="body" className="text-xs">
              {t('response.body')}
            </TabsTrigger>
            <TabsTrigger value="headers" className="text-xs">
              {t('response.headers')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              {t('response.stats')}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            {requestResult.stats && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  requestResult.stats.status >= 200 && requestResult.stats.status < 300
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                )}
              >
                {requestResult.stats.status} {requestResult.stats.statusText}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearResult}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <TabsContent value="body" className="flex-1 m-0 overflow-hidden min-w-0">
          <ScrollArea className="h-full w-full">
            <div className="p-2 max-w-full overflow-hidden">
              <JsonViewer data={requestResult.response} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="headers" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Key</th>
                    <th className="text-left p-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {requestResult.headers.map((h, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-mono text-xs">{h.key}</td>
                      <td className="p-2 font-mono text-xs break-all">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stats" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {requestResult.stats && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('response.status')}</span>
                    <span className="text-sm font-mono">
                      {requestResult.stats.status} {requestResult.stats.statusText}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('response.duration')}</span>
                    <span className="text-sm font-mono">
                      {formatDuration(requestResult.stats.duration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('response.size')}</span>
                    <span className="text-sm font-mono">
                      {formatBytes(requestResult.stats.size)}
                    </span>
                  </div>
                  <div className="pt-4">
                    <Button variant="outline" size="sm" onClick={handleDownloadBundle}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Bundle
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
