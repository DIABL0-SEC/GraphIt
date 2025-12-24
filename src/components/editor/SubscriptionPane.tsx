'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Pause, Play as Resume, Trash2, Download } from 'lucide-react';
import { useStore, useActiveTab, useActiveWorkspace, useActiveEnvironment } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subscribe, disconnectAll, type SubscriptionHandle } from '@/lib/subscription';
import { buildInterpolationContext } from '@/lib/interpolation';
import { downloadFile, formatTimestamp, safeStringify } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { SubscriptionMessage } from '@/types';

export default function SubscriptionPane() {
  const { t } = useTranslation();
  const activeTab = useActiveTab();
  const activeWorkspace = useActiveWorkspace();
  const activeEnvironment = useActiveEnvironment();
  const updateTab = useStore((s) => s.updateTab);
  const subscriptionActive = useStore((s) => s.subscriptionActive);
  const setSubscriptionActive = useStore((s) => s.setSubscriptionActive);
  const subscriptionMessages = useStore((s) => s.subscriptionMessages);
  const addSubscriptionMessage = useStore((s) => s.addSubscriptionMessage);
  const clearSubscriptionMessages = useStore((s) => s.clearSubscriptionMessages);
  const subscriptionPaused = useStore((s) => s.subscriptionPaused);
  const toggleSubscriptionPaused = useStore((s) => s.toggleSubscriptionPaused);

  const subscriptionRef = useRef<SubscriptionHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !subscriptionPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subscriptionMessages, subscriptionPaused]);

  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, []);

  if (!activeTab) return null;

  const handleConnect = async () => {
    if (!activeTab) return;

    const endpoint = activeTab.subscriptionUrl || (
      activeTab.useWorkspaceEndpoint
        ? activeWorkspace?.defaultEndpoint || ''
        : activeTab.endpoint || ''
    );

    if (!endpoint) return;

    const context = buildInterpolationContext(activeEnvironment?.variables || []);

    try {
      subscriptionRef.current = await subscribe({
        url: endpoint,
        query: activeTab.query,
        variables: activeTab.variables,
        headers: [
          ...(activeWorkspace?.defaultHeaders || []),
          ...activeTab.headers,
        ],
        auth: activeTab.auth,
        protocol: activeTab.subscriptionProtocol,
        context,
        onMessage: (msg) => {
          addSubscriptionMessage(msg);
        },
        onError: (error) => {
          addSubscriptionMessage({
            id: crypto.randomUUID(),
            type: 'error',
            payload: { message: error.message },
            timestamp: Date.now(),
          });
        },
        onComplete: () => {
          setSubscriptionActive(false);
        },
        onConnected: () => {
          setSubscriptionActive(true);
        },
      });
    } catch (error) {
      addSubscriptionMessage({
        id: crypto.randomUUID(),
        type: 'error',
        payload: { message: error instanceof Error ? error.message : 'Connection failed' },
        timestamp: Date.now(),
      });
    }
  };

  const handleDisconnect = () => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setSubscriptionActive(false);
  };

  const handleExport = () => {
    const data = subscriptionMessages.map((m) => ({
      type: m.type,
      payload: m.payload,
      timestamp: new Date(m.timestamp).toISOString(),
    }));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(
      safeStringify(data, 2),
      `subscription-log-${timestamp}.json`
    );
  };

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Select
            value={activeTab.subscriptionProtocol}
            onValueChange={(v) =>
              updateTab(activeTab.id, { subscriptionProtocol: v as 'ws' | 'sse' | 'appsync' })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ws">{t('subscription.ws')}</SelectItem>
              <SelectItem value="sse">{t('subscription.sse')}</SelectItem>
              <SelectItem value="appsync">{t('subscription.appsync')}</SelectItem>
            </SelectContent>
          </Select>

          {subscriptionActive ? (
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              <Square className="h-4 w-4 mr-1" />
              {t('subscription.disconnect')}
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleConnect}>
              <Play className="h-4 w-4 mr-1" />
              {t('subscription.connect')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder={t('subscription.url')}
            value={activeTab.subscriptionUrl}
            onChange={(e) => updateTab(activeTab.id, { subscriptionUrl: e.target.value })}
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30">
        <span className="text-xs font-medium">{t('subscription.messages')}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleSubscriptionPaused}
          >
            {subscriptionPaused ? (
              <Resume className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleExport}
            disabled={subscriptionMessages.length === 0}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearSubscriptionMessages}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        {subscriptionMessages.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('subscription.noMessages')}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {subscriptionMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'p-2 rounded-md text-xs font-mono',
                  msg.type === 'data' && 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800',
                  msg.type === 'error' && 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800',
                  msg.type === 'complete' && 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
                  msg.type === 'connection' && 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase',
                      msg.type === 'data' && 'text-green-600 dark:text-green-400',
                      msg.type === 'error' && 'text-red-600 dark:text-red-400',
                      msg.type === 'complete' && 'text-gray-600 dark:text-gray-400',
                      msg.type === 'connection' && 'text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {msg.type}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-all">
                  {safeStringify(msg.payload, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
