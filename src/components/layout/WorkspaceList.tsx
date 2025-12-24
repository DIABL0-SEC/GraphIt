'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
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

export default function WorkspaceList() {
  const { t } = useTranslation();
  const workspaces = useStore((s) => s.workspaces);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace);
  const createWorkspace = useStore((s) => s.createWorkspace);
  const updateWorkspace = useStore((s) => s.updateWorkspace);
  const deleteWorkspace = useStore((s) => s.deleteWorkspace);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const handleCreate = async () => {
    if (!workspaceName.trim()) return;
    const ws = await createWorkspace(workspaceName);
    await setActiveWorkspace(ws.id);
    setShowNewDialog(false);
    setWorkspaceName('');
  };

  const handleRename = async () => {
    if (!workspaceName.trim() || !selectedWorkspaceId) return;
    await updateWorkspace(selectedWorkspaceId, { name: workspaceName });
    setShowRenameDialog(false);
    setWorkspaceName('');
    setSelectedWorkspaceId(null);
  };

  const handleDelete = async () => {
    if (!selectedWorkspaceId) return;
    await deleteWorkspace(selectedWorkspaceId);
    setShowDeleteDialog(false);
    setSelectedWorkspaceId(null);
  };

  const openRenameDialog = (id: string, name: string) => {
    setSelectedWorkspaceId(id);
    setWorkspaceName(name);
    setShowRenameDialog(true);
  };

  const openDeleteDialog = (id: string) => {
    setSelectedWorkspaceId(id);
    setShowDeleteDialog(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setWorkspaceName('');
            setShowNewDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('sidebar.newWorkspace')}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent group',
                activeWorkspaceId === ws.id && 'bg-accent'
              )}
              onClick={() => setActiveWorkspace(ws.id)}
            >
              <span className="text-sm truncate flex-1">{ws.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openRenameDialog(ws.id, ws.name)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('workspace.rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => openDeleteDialog(ws.id)}
                    disabled={workspaces.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('workspace.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* New Workspace Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspace.new')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('workspace.default')}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Workspace Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspace.rename')}</DialogTitle>
          </DialogHeader>
          <Input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
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

      {/* Delete Workspace Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspace.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('workspace.deleteConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
