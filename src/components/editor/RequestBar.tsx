'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Loader2, ChevronDown } from 'lucide-react';
import { useStore, useActiveTab, useActiveWorkspace, useActiveEnvironment } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { executeRequest } from '@/lib/request';
import { runPreRequestScript, runPostRequestScript } from '@/lib/scripts';
import { buildInterpolationContext, interpolateString } from '@/lib/interpolation';
import { getOperationNames } from '@/lib/graphql';
import type { EnvVariable } from '@/types';

export default function RequestBar() {
  const { t } = useTranslation();
  const settings = useStore((s) => s.settings);
  const activeTab = useActiveTab();
  const activeWorkspace = useActiveWorkspace();
  const activeEnvironment = useActiveEnvironment();
  const environments = useStore((s) => s.environments);
  const setActiveEnvironment = useStore((s) => s.setActiveEnvironment);
  const updateTab = useStore((s) => s.updateTab);
  const requestLoading = useStore((s) => s.requestLoading);
  const setRequestLoading = useStore((s) => s.setRequestLoading);
  const setRequestResult = useStore((s) => s.setRequestResult);
  const addHistoryEntry = useStore((s) => s.addHistoryEntry);
  const addScriptLog = useStore((s) => s.addScriptLog);
  const clearScriptLogs = useStore((s) => s.clearScriptLogs);

  const handleRun = useCallback(async (operationName?: string) => {
    if (!activeTab) return;

    const endpoint = activeTab.useWorkspaceEndpoint
      ? activeWorkspace?.defaultEndpoint || ''
      : activeTab.endpoint;

    if (!endpoint) return;

    setRequestLoading(true);
    clearScriptLogs();

    try {
      // Build initial context
      let envVars = activeEnvironment?.variables || [];
      let context = buildInterpolationContext(envVars);

      // Merge workspace default headers with tab headers
      const allHeaders = [
        ...(activeWorkspace?.defaultHeaders || []),
        ...activeTab.headers,
      ];

      // Run pre-request script
      if (activeTab.preRequestScript) {
        const scriptResult = await runPreRequestScript(
          activeTab.preRequestScript,
          envVars,
          activeTab.variables,
          allHeaders,
          settings.scriptTimeout
        );

        // Log script output
        scriptResult.logs.forEach(log => addScriptLog(log));

        if (!scriptResult.success) {
          addScriptLog(`Error: ${scriptResult.error}`);
          setRequestResult({
            response: null,
            headers: [],
            stats: null,
            error: `Pre-request script error: ${scriptResult.error}`,
          });
          return;
        }

        // Apply script overrides
        const overriddenVars: EnvVariable[] = envVars.map(v => {
          if (v.name in scriptResult.envOverrides) {
            return { ...v, value: scriptResult.envOverrides[v.name] as string };
          }
          return v;
        });
        envVars = overriddenVars;
        context = buildInterpolationContext(envVars);

        // Apply header overrides
        for (const [key, value] of Object.entries(scriptResult.headersOverrides)) {
          const existing = allHeaders.find(h => h.key === key);
          if (existing) {
            existing.value = value;
          } else {
            allHeaders.push({
              id: crypto.randomUUID(),
              key,
              value,
              enabled: true,
            });
          }
        }
      }

      // Execute request
      const result = await executeRequest({
        endpoint: interpolateString(endpoint, context),
        query: activeTab.query,
        variables: activeTab.variables,
        operationName,
        headers: allHeaders,
        auth: activeTab.auth,
        httpMethod: activeTab.httpMethod,
        fileMappings: activeTab.fileMappings,
        useProxy: settings.proxyMode,
        timeout: settings.requestTimeout,
        context,
      });

      // Run post-request script
      if (activeTab.postRequestScript && result.response) {
        const postResult = await runPostRequestScript(
          activeTab.postRequestScript,
          envVars,
          activeTab.variables,
          allHeaders,
          result.response,
          settings.scriptTimeout
        );

        postResult.logs.forEach(log => addScriptLog(log));

        if (!postResult.success) {
          addScriptLog(`Post-request script error: ${postResult.error}`);
        }
      }

      setRequestResult(result);

      // Add to history
      await addHistoryEntry({
        workspaceId: activeWorkspace?.id || '',
        environmentId: activeEnvironment?.id || null,
        endpoint: interpolateString(endpoint, context),
        query: activeTab.query,
        variables: activeTab.variables,
        operationName: operationName || null,
        status: result.stats?.status || 0,
        duration: result.stats?.duration || 0,
        timestamp: Date.now(),
        responseSize: result.stats?.size || 0,
      });
    } catch (error) {
      setRequestResult({
        response: null,
        headers: [],
        stats: null,
        error: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setRequestLoading(false);
    }
  }, [activeTab, activeWorkspace, activeEnvironment, settings, setRequestLoading, setRequestResult, addHistoryEntry, addScriptLog, clearScriptLogs]);

  if (!activeTab) return null;

  const endpoint = activeTab.useWorkspaceEndpoint
    ? activeWorkspace?.defaultEndpoint || ''
    : activeTab.endpoint;

  const operations = getOperationNames(activeTab.query);

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
      <Select
        value={activeTab.httpMethod}
        onValueChange={(v) =>
          updateTab(activeTab.id, { httpMethod: v as typeof activeTab.httpMethod })
        }
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="POST">POST</SelectItem>
          <SelectItem value="GET">GET</SelectItem>
          <SelectItem value="PUT">PUT</SelectItem>
          <SelectItem value="PATCH">PATCH</SelectItem>
          <SelectItem value="DELETE">DELETE</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder={t('request.endpoint')}
        value={activeTab.useWorkspaceEndpoint ? activeWorkspace?.defaultEndpoint || '' : activeTab.endpoint}
        onChange={(e) => {
          if (activeTab.useWorkspaceEndpoint && activeWorkspace) {
            // Update workspace default endpoint
            useStore.getState().updateWorkspace(activeWorkspace.id, { defaultEndpoint: e.target.value });
          } else {
            updateTab(activeTab.id, { endpoint: e.target.value });
          }
        }}
        className="flex-1"
      />

      <div className="flex items-center gap-1 text-xs">
        <Switch
          checked={activeTab.useWorkspaceEndpoint}
          onCheckedChange={(checked) =>
            updateTab(activeTab.id, { useWorkspaceEndpoint: checked })
          }
        />
        <span className="text-muted-foreground whitespace-nowrap">
          {t('request.useWorkspaceEndpoint')}
        </span>
      </div>

      <Select
        value={activeEnvironment?.id || ''}
        onValueChange={(v) => setActiveEnvironment(v || null)}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder={t('environments.noEnv')} />
        </SelectTrigger>
        <SelectContent>
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id}>
              {env.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {operations.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={requestLoading || !endpoint}>
              {requestLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t('editor.run')}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {operations.map((op) => (
              <DropdownMenuItem key={op} onClick={() => handleRun(op)}>
                {op}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={() => handleRun(operations[0])}
          disabled={requestLoading || !endpoint}
        >
          {requestLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {t('editor.run')}
        </Button>
      )}
    </div>
  );
}
