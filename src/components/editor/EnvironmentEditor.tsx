'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useStore, useActiveEnvironment, useActiveWorkspace } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { EnvVariable } from '@/types';

export default function EnvironmentEditor() {
  const { t } = useTranslation();
  const environments = useStore((s) => s.environments);
  const createEnvironment = useStore((s) => s.createEnvironment);
  const updateEnvironment = useStore((s) => s.updateEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);
  const activeEnvironment = useActiveEnvironment();
  const activeWorkspace = useActiveWorkspace();
  const setActiveEnvironment = useStore((s) => s.setActiveEnvironment);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [envName, setEnvName] = useState('');
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  const handleCreateEnv = async () => {
    if (!envName.trim()) return;
    const env = await createEnvironment(envName);
    setActiveEnvironment(env.id);
    setShowNewDialog(false);
    setEnvName('');
  };

  const addVariable = () => {
    if (!activeEnvironment) return;
    const newVar: EnvVariable = {
      id: crypto.randomUUID(),
      name: '',
      value: '',
      isSecret: false,
    };
    updateEnvironment(activeEnvironment.id, {
      variables: [...activeEnvironment.variables, newVar],
    });
  };

  const updateVariable = (id: string, updates: Partial<EnvVariable>) => {
    if (!activeEnvironment) return;
    updateEnvironment(activeEnvironment.id, {
      variables: activeEnvironment.variables.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    });
  };

  const removeVariable = (id: string) => {
    if (!activeEnvironment) return;
    updateEnvironment(activeEnvironment.id, {
      variables: activeEnvironment.variables.filter((v) => v.id !== id),
    });
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b flex items-center gap-2">
        <select
          value={activeEnvironment?.id || ''}
          onChange={(e) => setActiveEnvironment(e.target.value || null)}
          className="flex-1 h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">{t('environments.noEnv')}</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEnvName('');
            setShowNewDialog(true);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {activeEnvironment && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteEnvironment(activeEnvironment.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {activeEnvironment && (
        <>
          <div className="p-2 border-b">
            <Button variant="outline" size="sm" onClick={addVariable}>
              <Plus className="h-4 w-4 mr-2" />
              {t('environments.addVariable')}
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {activeEnvironment.variables.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No variables. Click &quot;Add Variable&quot; to create one.
                </div>
              ) : (
                activeEnvironment.variables.map((variable) => (
                  <div key={variable.id} className="flex items-center gap-2">
                    <Input
                      placeholder={t('environments.name')}
                      value={variable.name}
                      onChange={(e) =>
                        updateVariable(variable.id, { name: e.target.value })
                      }
                      className="w-32"
                    />
                    <div className="relative flex-1">
                      <Input
                        placeholder={t('environments.value')}
                        type={variable.isSecret && !showSecrets.has(variable.id) ? 'password' : 'text'}
                        value={String(variable.value)}
                        onChange={(e) =>
                          updateVariable(variable.id, { value: e.target.value })
                        }
                        className="pr-8"
                      />
                      {variable.isSecret && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-8"
                          onClick={() => toggleShowSecret(variable.id)}
                        >
                          {showSecrets.has(variable.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={variable.isSecret}
                        onCheckedChange={(checked) =>
                          updateVariable(variable.id, { isSecret: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {t('environments.secret')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariable(variable.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {!activeEnvironment && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('environments.noEnv')}</p>
        </div>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('environments.new')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('environments.local')}
            value={envName}
            onChange={(e) => setEnvName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateEnv()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateEnv}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
