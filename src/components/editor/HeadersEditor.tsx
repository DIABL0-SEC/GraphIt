'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { useStore, useActiveTab } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Header } from '@/types';

export default function HeadersEditor() {
  const { t } = useTranslation();
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);

  if (!activeTab) return null;

  const headers = activeTab.headers;

  const addHeader = () => {
    const newHeader: Header = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    };
    updateTab(activeTab.id, { headers: [...headers, newHeader] });
  };

  const updateHeader = (id: string, updates: Partial<Header>) => {
    updateTab(activeTab.id, {
      headers: headers.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    });
  };

  const removeHeader = (id: string) => {
    updateTab(activeTab.id, {
      headers: headers.filter((h) => h.id !== id),
    });
  };

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b">
        <Button variant="outline" size="sm" onClick={addHeader}>
          <Plus className="h-4 w-4 mr-2" />
          {t('common.add')}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {headers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No headers. Click &quot;Add&quot; to create one.
            </div>
          ) : (
            headers.map((header) => (
              <div key={header.id} className="flex items-center gap-2">
                <Switch
                  checked={header.enabled}
                  onCheckedChange={(checked) => updateHeader(header.id, { enabled: checked })}
                />
                <Input
                  placeholder="Key"
                  value={header.key}
                  onChange={(e) => updateHeader(header.id, { key: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={header.value}
                  onChange={(e) => updateHeader(header.id, { value: e.target.value })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHeader(header.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
