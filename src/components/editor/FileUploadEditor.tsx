'use client';

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useStore, useActiveTab } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileMapping } from '@/types';

export default function FileUploadEditor() {
  const { t } = useTranslation();
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  if (!activeTab) return null;

  const fileMappings = activeTab.fileMappings;

  const addMapping = () => {
    const newMapping: FileMapping = {
      id: crypto.randomUUID(),
      variablePath: '',
      file: null,
      fileName: '',
    };
    updateTab(activeTab.id, { fileMappings: [...fileMappings, newMapping] });
  };

  const updateMapping = (id: string, updates: Partial<FileMapping>) => {
    updateTab(activeTab.id, {
      fileMappings: fileMappings.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  const removeMapping = (id: string) => {
    updateTab(activeTab.id, {
      fileMappings: fileMappings.filter((m) => m.id !== id),
    });
  };

  const handleFileSelect = (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    updateMapping(id, { file, fileName: file.name });
  };

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b">
        <Button variant="outline" size="sm" onClick={addMapping}>
          <Plus className="h-4 w-4 mr-2" />
          {t('uploads.addFile')}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {fileMappings.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('uploads.noFiles')}
            </div>
          ) : (
            fileMappings.map((mapping) => (
              <div key={mapping.id} className="p-3 border rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t('uploads.variablePath')}
                    value={mapping.variablePath}
                    onChange={(e) => updateMapping(mapping.id, { variablePath: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(mapping.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={(el) => {
                      if (el) fileInputRefs.current.set(mapping.id, el);
                    }}
                    onChange={(e) => handleFileSelect(mapping.id, e.target.files)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current.get(mapping.id)?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {mapping.fileName || t('uploads.selectFile')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
