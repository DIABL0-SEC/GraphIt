'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Trash2, ChevronRight, ChevronDown, Plus, ArrowUpDown } from 'lucide-react';
import { useStore, useActiveWorkspace, useActiveEnvironment, useActiveTab } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchIntrospection, extractSchemaTypes, generateQueryFromField, getQueryType, getMutationType, getSubscriptionType } from '@/lib/graphql';
import { buildInterpolationContext, interpolateString } from '@/lib/interpolation';
import { cn } from '@/lib/utils';
import type { GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLArgument, GraphQLOutputType, GraphQLInputType } from 'graphql';

export default function DocsExplorer() {
  const { t } = useTranslation();
  const settings = useStore((s) => s.settings);
  const schemaCache = useStore((s) => s.schemaCache);
  const setSchema = useStore((s) => s.setSchema);
  const setSchemaLoading = useStore((s) => s.setSchemaLoading);
  const setSchemaError = useStore((s) => s.setSchemaError);
  const schemaLoading = useStore((s) => s.schemaLoading);
  const schemaError = useStore((s) => s.schemaError);
  const clearSchemaCache = useStore((s) => s.clearSchemaCache);
  const activeWorkspace = useActiveWorkspace();
  const activeEnvironment = useActiveEnvironment();
  const activeTab = useActiveTab();
  const updateTab = useStore((s) => s.updateTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleFieldExpanded = (fieldKey: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const getTypeName = (type: GraphQLOutputType | GraphQLInputType): string => {
    if ('ofType' in type && type.ofType) {
      const inner = getTypeName(type.ofType);
      if (type.constructor.name === 'GraphQLNonNull') {
        return `${inner}!`;
      }
      if (type.constructor.name === 'GraphQLList') {
        return `[${inner}]`;
      }
    }
    if ('name' in type && type.name) {
      return type.name;
    }
    return String(type);
  };

  const getBaseTypeName = (type: GraphQLOutputType | GraphQLInputType): string => {
    if ('ofType' in type && type.ofType) {
      return getBaseTypeName(type.ofType);
    }
    if ('name' in type && type.name) {
      return type.name;
    }
    return String(type);
  };

  const endpoint = activeTab?.useWorkspaceEndpoint
    ? activeWorkspace?.defaultEndpoint || ''
    : activeTab?.endpoint || '';

  const schema = schemaCache.get(endpoint);

  const handleLoadSchema = async () => {
    if (!endpoint) return;

    setSchemaLoading(true);
    setSchemaError(null);

    try {
      const context = buildInterpolationContext(activeEnvironment?.variables || []);
      const interpolatedEndpoint = interpolateString(endpoint, context);

      const headers: Record<string, string> = {};
      const allHeaders = [
        ...(activeWorkspace?.defaultHeaders || []),
        ...(activeTab?.headers || []),
      ];
      for (const h of allHeaders) {
        if (h.enabled) {
          headers[interpolateString(h.key, context)] = interpolateString(h.value, context);
        }
      }

      const result = await fetchIntrospection(
        interpolatedEndpoint,
        headers,
        settings.proxyMode
      );

      setSchema(endpoint, result.schema);
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message : 'Failed to load schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const types = useMemo(() => {
    if (!schema) return [];
    return extractSchemaTypes(schema);
  }, [schema]);

  const queryType = schema ? getQueryType(schema) : null;
  const mutationType = schema ? getMutationType(schema) : null;
  const subscriptionType = schema ? getSubscriptionType(schema) : null;

  const filteredTypes = useMemo(() => {
    let result = types.filter((t) => !t.name.startsWith('__'));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.fields?.some((f) => f.name.toLowerCase().includes(query))
      );
    }

    if (sortAlphabetically) {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [types, searchQuery, sortAlphabetically]);

  const handleInsertQuery = (
    field: GraphQLField<unknown, unknown>,
    operationType: 'query' | 'mutation' | 'subscription'
  ) => {
    if (!activeTab) return;
    const query = generateQueryFromField(field, operationType);
    updateTab(activeTab.id, { query });
  };

  const navigateToType = (typeName: string) => {
    setBreadcrumbs([...breadcrumbs, selectedType || 'root']);
    setSelectedType(typeName);
  };

  const navigateBack = () => {
    const newBreadcrumbs = [...breadcrumbs];
    const prev = newBreadcrumbs.pop();
    setBreadcrumbs(newBreadcrumbs);
    setSelectedType(prev === 'root' ? null : prev || null);
  };

  const renderFields = (fields: { name: string; type: string; description: string | null; args?: { name: string; type: string }[] }[] | undefined) => {
    if (!fields) return null;

    const sorted = sortAlphabetically
      ? [...fields].sort((a, b) => a.name.localeCompare(b.name))
      : fields;

    return (
      <div className="space-y-1">
        {sorted.map((field) => (
          <div
            key={field.name}
            className="p-2 rounded-md hover:bg-accent cursor-pointer"
            onClick={() => {
              const typeName = field.type.replace(/[\[\]!]/g, '');
              if (types.find((t) => t.name === typeName)) {
                navigateToType(typeName);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {field.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{field.type}</span>
            </div>
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
            {field.args && field.args.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Args: {field.args.map((a) => `${a.name}: ${a.type}`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOperationFields = (
    type: GraphQLObjectType | null,
    operationType: 'query' | 'mutation' | 'subscription',
    label: string
  ) => {
    if (!type) return null;

    let fields = Object.values(type.getFields());

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      fields = fields.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query) ||
          f.args?.some((a) => a.name.toLowerCase().includes(query))
      );
    }

    if (fields.length === 0) return null;

    const sorted = sortAlphabetically
      ? [...fields].sort((a, b) => a.name.localeCompare(b.name))
      : fields;

    return (
      <div className="mb-4 overflow-hidden">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{label}</h4>
        <div className="space-y-1 overflow-hidden">
          {sorted.map((field) => {
            const fieldKey = `${operationType}-${field.name}`;
            const isExpanded = expandedFields.has(fieldKey);
            const returnTypeName = getTypeName(field.type);
            const baseReturnType = getBaseTypeName(field.type);
            const args = field.args || [];

            return (
              <div
                key={field.name}
                className="rounded-md border border-transparent hover:border-border overflow-hidden"
              >
                <div
                  className="p-2 hover:bg-accent cursor-pointer group flex items-center justify-between"
                  onClick={() => toggleFieldExpanded(fieldKey)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-primary truncate">
                      {field.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      : {returnTypeName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertQuery(field, operationType);
                    }}
                    title={t('docs.insert')}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t bg-muted/30 overflow-hidden">
                    {field.description && (
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed whitespace-pre-wrap break-words">
                        {field.description}
                      </p>
                    )}

                    {args.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-muted-foreground block mb-2">
                          Arguments:
                        </span>
                        <div className="space-y-3">
                          {args.map((arg: GraphQLArgument) => (
                            <div key={arg.name} className="text-xs pl-2 border-l-2 border-primary/30 overflow-hidden">
                              <div className="flex flex-wrap items-baseline gap-x-1">
                                <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                                  {arg.name}
                                </span>
                                <span className="text-muted-foreground">:</span>
                                <span className="font-mono text-primary break-all">
                                  {getTypeName(arg.type)}
                                </span>
                              </div>
                              {arg.description && (
                                <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                  {arg.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/50">
                      <span className="font-semibold text-muted-foreground">Returns:</span>
                      <button
                        className="font-mono text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (types.find((t) => t.name === baseReturnType)) {
                            navigateToType(baseReturnType);
                          }
                        }}
                      >
                        {returnTypeName}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!schema && !schemaLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 themed-bg">
        <p className="text-sm text-muted-foreground mb-4">{t('docs.noSchema')}</p>
        <Button onClick={handleLoadSchema} disabled={!endpoint}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('docs.loadSchema')}
        </Button>
        {schemaError && (
          <p className="text-sm text-destructive mt-4 text-center">{schemaError}</p>
        )}
      </div>
    );
  }

  if (schemaLoading) {
    return (
      <div className="h-full flex items-center justify-center themed-bg">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('docs.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSortAlphabetically(!sortAlphabetically)}
            title={sortAlphabetically ? t('docs.schemaOrder') : t('docs.alphabetical')}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLoadSchema}
            title={t('docs.reloadSchema')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearSchemaCache}
            title={t('docs.clearCache')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => { setSelectedType(null); setBreadcrumbs([]); }} className="hover:underline">
              Root
            </button>
            {breadcrumbs.filter(b => b !== 'root').map((b, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="h-3 w-3" />
                <button onClick={navigateBack} className="hover:underline">
                  {b}
                </button>
              </React.Fragment>
            ))}
            {selectedType && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">{selectedType}</span>
              </>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 max-w-full overflow-hidden">
          {selectedType ? (
            <div>
              {(() => {
                const type = filteredTypes.find((t) => t.name === selectedType);
                if (!type) return <p className="text-sm">Type not found</p>;

                return (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{type.name}</h3>
                      <span className="text-xs text-muted-foreground">{type.kind}</span>
                      {type.description && (
                        <p className="text-sm text-muted-foreground mt-2">{type.description}</p>
                      )}
                    </div>
                    {type.fields && renderFields(type.fields)}
                    {type.enumValues && (
                      <div className="space-y-1">
                        {type.enumValues.map((v) => (
                          <div key={v} className="p-2 rounded-md bg-accent/50">
                            <span className="text-sm font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div>
              {renderOperationFields(queryType, 'query', t('docs.queries'))}
              {renderOperationFields(mutationType, 'mutation', t('docs.mutations'))}
              {renderOperationFields(subscriptionType, 'subscription', t('docs.subscriptions'))}

              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 mt-4">
                {t('docs.types')}
              </h4>
              <div className="space-y-1">
                {filteredTypes
                  .filter((t) => !['Query', 'Mutation', 'Subscription'].includes(t.name))
                  .map((type) => (
                    <div
                      key={type.name}
                      className="p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => navigateToType(type.name)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{type.name}</span>
                        <span className="text-xs text-muted-foreground">{type.kind}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
