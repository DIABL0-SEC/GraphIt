'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Folder,
  History,
  Settings,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Layers,
  Zap,
} from 'lucide-react';
import { useStore, useActiveWorkspace } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import WorkspaceList from './WorkspaceList';
import CollectionsList from '../collections/CollectionsList';
import HistoryList from './HistoryList';
import SettingsPanel from '../settings/SettingsPanel';

export default function Sidebar() {
  const { t } = useTranslation();
  const sidebarSection = useStore((s) => s.sidebarSection);
  const setSidebarSection = useStore((s) => s.setSidebarSection);

  const sections = [
    { id: 'workspaces' as const, icon: Layers, label: t('sidebar.workspaces') },
    { id: 'collections' as const, icon: Folder, label: t('sidebar.collections') },
    { id: 'history' as const, icon: History, label: t('sidebar.history') },
    { id: 'settings' as const, icon: Settings, label: t('sidebar.settings') },
  ];

  return (
    <div className="flex h-full flex-col border-r themed-bg">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 px-3 py-3 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">GraphIt</span>
      </div>

      {/* Section tabs */}
      <div className="flex border-b p-1 gap-1">
        {sections.map((section) => (
          <Button
            key={section.id}
            variant={sidebarSection === section.id ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarSection(section.id)}
            title={section.label}
          >
            <section.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-hidden">
        {sidebarSection === 'workspaces' && <WorkspaceList />}
        {sidebarSection === 'collections' && <CollectionsList />}
        {sidebarSection === 'history' && <HistoryList />}
        {sidebarSection === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
