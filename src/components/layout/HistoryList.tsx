'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ExternalLink } from 'lucide-react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTimestamp, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function HistoryList() {
  const { t } = useTranslation();
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);
  const createTab = useStore((s) => s.createTab);
  const updateTab = useStore((s) => s.updateTab);

  const handleRestore = async (entry: typeof history[0]) => {
    const tab = await createTab();
    await updateTab(tab.id, {
      name: entry.operationName || 'Restored Query',
      query: entry.query,
      variables: entry.variables,
      endpoint: entry.endpoint,
      useWorkspaceEndpoint: false,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">{t('history.title')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => clearHistory()}
          disabled={history.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {t('history.clear')}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('history.empty')}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded-md hover:bg-accent cursor-pointer group"
                onClick={() => handleRestore(entry)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {entry.operationName || 'Anonymous'}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      entry.status >= 200 && entry.status < 300
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    )}
                  >
                    {entry.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatTimestamp(entry.timestamp)}</span>
                  <span>•</span>
                  <span>{formatDuration(entry.duration)}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {entry.endpoint}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
