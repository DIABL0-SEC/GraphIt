'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, MoreHorizontal, Copy, Edit2 } from 'lucide-react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function TabBar() {
  const { t } = useTranslation();
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const createTab = useStore((s) => s.createTab);
  const updateTab = useStore((s) => s.updateTab);
  const duplicateTab = useStore((s) => s.duplicateTab);
  const deleteTab = useStore((s) => s.deleteTab);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabName, setTabName] = useState('');

  const handleRename = async () => {
    if (!tabName.trim() || !selectedTabId) return;
    await updateTab(selectedTabId, { name: tabName });
    setShowRenameDialog(false);
    setTabName('');
    setSelectedTabId(null);
  };

  const openRenameDialog = (id: string, name: string) => {
    setSelectedTabId(id);
    setTabName(name);
    setShowRenameDialog(true);
  };

  const handleClose = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteTab(id);
    } catch {
      // Can't delete the last tab
    }
  };

  const handleCloseOthers = async (id: string) => {
    const otherTabs = tabs.filter((t) => t.id !== id);
    for (const tab of otherTabs) {
      try {
        await deleteTab(tab.id);
      } catch {
        // Keep going
      }
    }
    await setActiveTab(id);
  };

  return (
    <div className="flex items-center border-b bg-muted/30">
      <ScrollArea className="flex-1">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                'flex items-center gap-1 px-3 py-2 border-r cursor-pointer hover:bg-accent group min-w-[120px] max-w-[200px]',
                activeTabId === tab.id && 'bg-background'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-sm truncate flex-1">{tab.name}</span>
              <div className="flex items-center gap-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => openRenameDialog(tab.id, tab.name)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t('tabs.rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateTab(tab.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('tabs.duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleCloseOthers(tab.id)}
                      disabled={tabs.length <= 1}
                    >
                      {t('tabs.closeOthers')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleClose(e, tab.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 m-1"
        onClick={() => createTab()}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tabs.rename')}</DialogTitle>
          </DialogHeader>
          <Input
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRename}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
