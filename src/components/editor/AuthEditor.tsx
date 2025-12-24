'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, useActiveTab } from '@/store';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AuthMode, AuthConfig } from '@/types';

export default function AuthEditor() {
  const { t } = useTranslation();
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);

  if (!activeTab) return null;

  const auth = activeTab.auth;

  const updateAuth = (updates: Partial<AuthConfig>) => {
    updateTab(activeTab.id, { auth: { ...auth, ...updates } });
  };

  const setMode = (mode: AuthMode) => {
    const newAuth: AuthConfig = { mode };
    if (mode === 'bearer') {
      newAuth.bearer = auth.bearer || { token: '' };
    } else if (mode === 'basic') {
      newAuth.basic = auth.basic || { username: '', password: '' };
    } else if (mode === 'api-key') {
      newAuth.apiKey = auth.apiKey || { key: '', value: '', addTo: 'header' };
    }
    updateTab(activeTab.id, { auth: newAuth });
  };

  return (
    <ScrollArea className="h-full themed-bg">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('auth.title')}</label>
          <Select value={auth.mode} onValueChange={(v) => setMode(v as AuthMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('auth.none')}</SelectItem>
              <SelectItem value="bearer">{t('auth.bearer')}</SelectItem>
              <SelectItem value="basic">{t('auth.basic')}</SelectItem>
              <SelectItem value="api-key">{t('auth.apiKey')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {auth.mode === 'bearer' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('auth.token')}</label>
            <Input
              type="password"
              placeholder="{{BEARER_TOKEN}}"
              value={auth.bearer?.token || ''}
              onChange={(e) =>
                updateAuth({ bearer: { token: e.target.value } })
              }
            />
          </div>
        )}

        {auth.mode === 'basic' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.username')}</label>
              <Input
                placeholder="username"
                value={auth.basic?.username || ''}
                onChange={(e) =>
                  updateAuth({
                    basic: { ...auth.basic!, username: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.password')}</label>
              <Input
                type="password"
                placeholder="password"
                value={auth.basic?.password || ''}
                onChange={(e) =>
                  updateAuth({
                    basic: { ...auth.basic!, password: e.target.value },
                  })
                }
              />
            </div>
          </>
        )}

        {auth.mode === 'api-key' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.key')}</label>
              <Input
                placeholder="X-API-Key"
                value={auth.apiKey?.key || ''}
                onChange={(e) =>
                  updateAuth({
                    apiKey: { ...auth.apiKey!, key: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.value')}</label>
              <Input
                type="password"
                placeholder="{{API_KEY}}"
                value={auth.apiKey?.value || ''}
                onChange={(e) =>
                  updateAuth({
                    apiKey: { ...auth.apiKey!, value: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.addTo')}</label>
              <Select
                value={auth.apiKey?.addTo || 'header'}
                onValueChange={(v) =>
                  updateAuth({
                    apiKey: { ...auth.apiKey!, addTo: v as 'header' | 'query' },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">{t('auth.header')}</SelectItem>
                  <SelectItem value="query">{t('auth.queryParam')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
