'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { changeLanguage } from '@/i18n';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SettingsPanel() {
  const { t } = useTranslation();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const handleLanguageChange = (lang: 'en' | 'es') => {
    updateSettings({ language: lang });
    changeLanguage(lang);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">{t('settings.general')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.theme')}</label>
              <Select
                value={settings.theme}
                onValueChange={(v) => updateSettings({ theme: v as 'light' | 'dark' })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('settings.light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.language')}</label>
              <Select
                value={settings.language}
                onValueChange={(v) => handleLanguageChange(v as 'en' | 'es')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm">{t('settings.proxyMode')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.proxyModeDesc')}
                </p>
              </div>
              <Switch
                checked={settings.proxyMode}
                onCheckedChange={(checked) => updateSettings({ proxyMode: checked })}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">{t('settings.editor')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.fontSize')}</label>
              <Input
                type="number"
                min={10}
                max={24}
                value={settings.editorFontSize}
                onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
                className="w-20"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.tabSize')}</label>
              <Select
                value={String(settings.editorTabSize)}
                onValueChange={(v) => updateSettings({ editorTabSize: Number(v) })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.minimap')}</label>
              <Switch
                checked={settings.editorMinimap}
                onCheckedChange={(checked) => updateSettings({ editorMinimap: checked })}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">{t('request.method')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.timeout')}</label>
              <Input
                type="number"
                min={1000}
                max={300000}
                step={1000}
                value={settings.requestTimeout}
                onChange={(e) => updateSettings({ requestTimeout: Number(e.target.value) })}
                className="w-28"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.batching')}</label>
              <Switch
                checked={settings.enableBatching}
                onCheckedChange={(checked) => updateSettings({ enableBatching: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">{t('settings.scriptTimeout')}</label>
              <Input
                type="number"
                min={500}
                max={10000}
                step={500}
                value={settings.scriptTimeout}
                onChange={(e) => updateSettings({ scriptTimeout: Number(e.target.value) })}
                className="w-28"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
