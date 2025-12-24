'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Folder,
  FolderOpen,
  FileCode,
  Download,
  Upload,
} from 'lucide-react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/lib/utils';
import type { Collection, CollectionItem } from '@/types';

export default function CollectionsList() {
  const { t } = useTranslation();
  const collections = useStore((s) => s.collections);
  const collectionItems = useStore((s) => s.collectionItems);
  const createCollection = useStore((s) => s.createCollection);
  const deleteCollection = useStore((s) => s.deleteCollection);
  const addCollectionItem = useStore((s) => s.addCollectionItem);
  const updateCollectionItem = useStore((s) => s.updateCollectionItem);
  const deleteCollectionItem = useStore((s) => s.deleteCollectionItem);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const createTab = useStore((s) => s.createTab);
  const updateTab = useStore((s) => s.updateTab);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) return;
    await createCollection(collectionName);
    setShowNewDialog(false);
    setCollectionName('');
  };

  const handleSaveToCollection = async (collectionId: string) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    await addCollectionItem({
      collectionId,
      parentId: null,
      type: 'item',
      name: activeTab.name,
      query: activeTab.query,
      variables: activeTab.variables,
      headers: activeTab.headers,
      auth: activeTab.auth,
      notes: activeTab.notes,
      order: collectionItems.filter((i) => i.collectionId === collectionId).length,
    });
  };

  const handleOpenItem = async (item: CollectionItem) => {
    if (item.type !== 'item') return;
    const tab = await createTab();
    await updateTab(tab.id, {
      name: item.name,
      query: item.query || '',
      variables: item.variables || '{}',
      headers: item.headers || [],
      auth: item.auth || { mode: 'none' },
      notes: item.notes || '',
    });
  };

  const handleExportCollection = (collection: Collection) => {
    const items = collectionItems.filter((i) => i.collectionId === collection.id);
    const exportData = {
      version: '1.0',
      type: 'collection',
      data: {
        ...collection,
        items: items.map((i) => ({
          ...i,
          // Don't export secrets by default
        })),
      },
      includeSecrets: false,
      exportedAt: Date.now(),
    };
    downloadFile(
      JSON.stringify(exportData, null, 2),
      `${collection.name.replace(/\s+/g, '-')}.json`
    );
  };

  const getItemsForCollection = (collectionId: string, parentId: string | null = null) => {
    return collectionItems
      .filter((i) => i.collectionId === collectionId && i.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const filteredCollections = searchQuery
    ? collections.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          collectionItems.some(
            (i) =>
              i.collectionId === c.id &&
              i.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : collections;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2 border-b">
        <Input
          placeholder={t('collections.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setCollectionName('');
            setShowNewDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('collections.new')}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {filteredCollections.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('collections.empty')}
          </div>
        ) : (
          <Accordion type="multiple" className="p-2">
            {filteredCollections.map((collection) => (
              <AccordionItem key={collection.id} value={collection.id}>
                <div className="flex items-center group">
                  <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="text-sm">{collection.name}</span>
                    </div>
                  </AccordionTrigger>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSaveToCollection(collection.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('collections.save')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportCollection(collection)}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('collections.export')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('collections.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <AccordionContent>
                  <div className="pl-4 space-y-1">
                    {getItemsForCollection(collection.id).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
                        onClick={() => handleOpenItem(item)}
                      >
                        <FileCode className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCollectionItem(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>

      {/* New Collection Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('collections.new')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Collection name"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateCollection}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
