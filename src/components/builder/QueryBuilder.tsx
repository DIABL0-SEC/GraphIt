'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, Search, ArrowUpDown } from 'lucide-react';
import { useStore, useActiveTab, useActiveWorkspace } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getQueryType, getMutationType, getSubscriptionType, getTypeName, getNamedType, isObjectType } from '@/lib/graphql';
import { cn } from '@/lib/utils';
import type { GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLType, GraphQLInputType } from 'graphql';

interface FieldNode {
  name: string;
  type: GraphQLType;
  args: Array<{ name: string; type: GraphQLInputType; isRequired: boolean }>;
  selected: boolean;
  expanded: boolean;
  children: FieldNode[];
  depth: number;
}

interface ArgValue {
  value: string;
  useVariable: boolean;
}

export default function QueryBuilder() {
  const { t } = useTranslation();
  const schemaCache = useStore((s) => s.schemaCache);
  const activeTab = useActiveTab();
  const activeWorkspace = useActiveWorkspace();
  const updateTab = useStore((s) => s.updateTab);

  const [operationType, setOperationType] = useState<'query' | 'mutation' | 'subscription'>('query');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<Map<string, FieldNode>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [maxDepth] = useState(5);
  const [sortAlphabetically, setSortAlphabetically] = useState(true);
  // Store argument values: key is "path.argName", value is the argument value
  const [argValues, setArgValues] = useState<Map<string, ArgValue>>(new Map());

  const updateArgValue = useCallback((path: string, argName: string, value: string, useVariable: boolean) => {
    setArgValues((prev) => {
      const next = new Map(prev);
      next.set(`${path}.${argName}`, { value, useVariable });
      return next;
    });
  }, []);

  const endpoint = activeTab?.useWorkspaceEndpoint
    ? activeWorkspace?.defaultEndpoint || ''
    : activeTab?.endpoint || '';

  const schema = schemaCache.get(endpoint);

  const rootType = useMemo(() => {
    if (!schema) return null;
    switch (operationType) {
      case 'query':
        return getQueryType(schema);
      case 'mutation':
        return getMutationType(schema);
      case 'subscription':
        return getSubscriptionType(schema);
      default:
        return null;
    }
  }, [schema, operationType]);

  const rootFields = useMemo(() => {
    if (!rootType) return [];
    const fields = Object.values(rootType.getFields());
    if (sortAlphabetically) {
      return [...fields].sort((a, b) => a.name.localeCompare(b.name));
    }
    return fields;
  }, [rootType, sortAlphabetically]);

  const filteredRootFields = useMemo(() => {
    if (!searchQuery) return rootFields;
    const query = searchQuery.toLowerCase();
    return rootFields.filter((f) => f.name.toLowerCase().includes(query));
  }, [rootFields, searchQuery]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback((path: string, field: GraphQLField<unknown, unknown>) => {
    setSelectedFields((prev) => {
      const next = new Map(prev);
      if (next.has(path)) {
        // Deselect this and all children
        const keysToDelete = Array.from(next.keys()).filter(
          (k) => k === path || k.startsWith(path + '.')
        );
        keysToDelete.forEach((k) => next.delete(k));
        return next;
      } else {
        // Select with parents - add the selected field
        const namedType = getNamedType(field.type);
        const fieldHasChildren = isObjectType(namedType);

        next.set(path, {
          name: field.name,
          type: field.type,
          args: field.args.map((a) => ({
            name: a.name,
            type: a.type,
            isRequired: getTypeName(a.type).endsWith('!'),
          })),
          selected: true,
          expanded: false,
          children: [],
          depth: path.split('.').length,
        });

        // Auto-select all parent paths
        const parts = path.split('.');
        for (let i = 1; i < parts.length; i++) {
          const parentPath = parts.slice(0, i).join('.');
          if (!next.has(parentPath)) {
            next.set(parentPath, {
              name: parts[i - 1],
              type: field.type,
              args: [],
              selected: true,
              expanded: true,
              children: [],
              depth: i,
            });
          }
        }

        // Auto-expand parent paths AND this field if it has children
        setExpandedPaths((prevExpanded) => {
          const nextExpanded = new Set(prevExpanded);
          for (let i = 1; i < parts.length; i++) {
            nextExpanded.add(parts.slice(0, i).join('.'));
          }
          // Auto-expand the selected field if it has children (object type)
          if (fieldHasChildren) {
            nextExpanded.add(path);
          }
          return nextExpanded;
        });

        return next;
      }
    });
  }, []);

  // Helper to get default scalar fields from an object type
  const getDefaultScalarFields = useCallback((type: GraphQLType): string[] => {
    const namedType = getNamedType(type);
    if (!isObjectType(namedType)) return [];

    const objectType = namedType as GraphQLObjectType;
    const fields = Object.values(objectType.getFields());
    const scalarFields: string[] = [];

    // Prioritize common fields
    const priorityFields = ['id', '__typename', 'name', 'title', 'key', 'value', 'cursor', 'node'];
    for (const pf of priorityFields) {
      const field = fields.find((f) => f.name === pf);
      if (field) {
        const fieldType = getNamedType(field.type);
        if (!isObjectType(fieldType)) {
          scalarFields.push(pf);
        }
      }
    }

    // If no priority fields found, get first few scalar fields
    if (scalarFields.length === 0) {
      for (const field of fields) {
        const fieldType = getNamedType(field.type);
        if (!isObjectType(fieldType)) {
          scalarFields.push(field.name);
          if (scalarFields.length >= 3) break;
        }
      }
    }

    // Always include __typename if nothing else
    if (scalarFields.length === 0) {
      scalarFields.push('__typename');
    }

    return scalarFields;
  }, []);

  const generateQuery = useCallback(() => {
    if (!activeTab || selectedFields.size === 0 || !rootType) return;

    const paths = Array.from(selectedFields.keys()).sort();
    const variables: Record<string, unknown> = {};
    const varDefs: string[] = [];
    const usedVarNames = new Set<string>();

    // Helper to get unique variable name
    const getVarName = (fieldName: string, argName: string): string => {
      let varName = `${argName}`;
      let counter = 1;
      while (usedVarNames.has(varName)) {
        varName = `${argName}${counter}`;
        counter++;
      }
      usedVarNames.add(varName);
      return varName;
    };

    // Helper to get GraphQL field from schema by path
    const getFieldByPath = (path: string): GraphQLField<unknown, unknown> | null => {
      const parts = path.split('.');
      let currentType: GraphQLObjectType | null = rootType;
      let field: GraphQLField<unknown, unknown> | null = null;

      for (const part of parts) {
        if (!currentType) return null;
        const fields = currentType.getFields();
        field = fields[part] || null;
        if (!field) return null;

        const namedType = getNamedType(field.type);
        currentType = isObjectType(namedType) ? namedType as GraphQLObjectType : null;
      }

      return field;
    };

    // Build arguments string for a field
    const buildArgs = (basePath: string, fieldNode: FieldNode): { argsStr: string; newVarDefs: string[] } => {
      const argsList: string[] = [];
      const newVarDefs: string[] = [];

      // Look up the actual GraphQL field from schema to get args
      const schemaField = getFieldByPath(basePath);
      const args = schemaField?.args || [];

      args.forEach((arg) => {
        const argKey = `${basePath}.${arg.name}`;
        const argValue = argValues.get(argKey);
        const argTypeName = getTypeName(arg.type);
        const isRequired = argTypeName.endsWith('!');

        if (argValue && argValue.value) {
          if (argValue.useVariable) {
            // Use as variable
            const varName = getVarName(fieldNode.name, arg.name);
            argsList.push(`${arg.name}: $${varName}`);
            newVarDefs.push(`$${varName}: ${argTypeName}`);
            // Try to parse the value as JSON, otherwise use as string
            try {
              variables[varName] = JSON.parse(argValue.value);
            } catch {
              variables[varName] = argValue.value;
            }
          } else {
            // Inline value
            const baseTypeName = argTypeName.replace(/[\[\]!]/g, '');
            if (baseTypeName === 'String' || baseTypeName === 'ID') {
              argsList.push(`${arg.name}: "${argValue.value}"`);
            } else if (baseTypeName === 'Int' || baseTypeName === 'Float') {
              argsList.push(`${arg.name}: ${argValue.value}`);
            } else if (baseTypeName === 'Boolean') {
              argsList.push(`${arg.name}: ${argValue.value.toLowerCase()}`);
            } else {
              // For enums and other types, try without quotes first
              argsList.push(`${arg.name}: ${argValue.value}`);
            }
          }
        } else if (isRequired) {
          // Required arg without value - use variable
          const varName = getVarName(fieldNode.name, arg.name);
          argsList.push(`${arg.name}: $${varName}`);
          newVarDefs.push(`$${varName}: ${argTypeName}`);
          variables[varName] = null;
        }
      });

      return {
        argsStr: argsList.length > 0 ? `(${argsList.join(', ')})` : '',
        newVarDefs,
      };
    };

    // Build selection tree
    const buildSelection = (basePath: string, depth: number): string => {
      const childPaths = paths.filter(
        (p) => p.startsWith(basePath + '.') && p.split('.').length === basePath.split('.').length + 1
      );

      const field = selectedFields.get(basePath);
      if (!field) return '';

      const { argsStr, newVarDefs } = buildArgs(basePath, field);
      varDefs.push(...newVarDefs);

      const namedType = getNamedType(field.type);
      const fieldIsObjectType = isObjectType(namedType);

      // If no children selected but field is an object type, auto-add scalar fields
      if (childPaths.length === 0) {
        if (fieldIsObjectType) {
          const defaultFields = getDefaultScalarFields(field.type);
          if (defaultFields.length > 0) {
            const indent = '  '.repeat(depth + 1);
            return `${field.name}${argsStr} {\n${indent}${defaultFields.join(`\n${indent}`)}\n${'  '.repeat(depth)}}`;
          }
        }
        return `${field.name}${argsStr}`;
      }

      const children = childPaths.map((p) => buildSelection(p, depth + 1));
      const indent = '  '.repeat(depth + 1);
      return `${field.name}${argsStr} {\n${indent}${children.join(`\n${indent}`)}\n${'  '.repeat(depth)}}`;
    };

    // Get top-level fields
    const topPaths = paths.filter((p) => p.split('.').length === 1);
    const selections = topPaths.map((p) => buildSelection(p, 1));

    const varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
    const opName = `${operationType.charAt(0).toUpperCase()}${operationType.slice(1)}Generated`;
    const query = `${operationType} ${opName}${varDefsStr} {\n  ${selections.join('\n  ')}\n}`;

    updateTab(activeTab.id, {
      query,
      variables: Object.keys(variables).length > 0
        ? JSON.stringify(variables, null, 2)
        : '{}',
    });
  }, [activeTab, selectedFields, operationType, updateTab, getDefaultScalarFields, argValues, rootType]);

  const renderField = (
    field: GraphQLField<unknown, unknown>,
    path: string,
    depth: number
  ): React.ReactNode => {
    const isSelected = selectedFields.has(path);
    const isExpanded = expandedPaths.has(path);
    const namedType = getNamedType(field.type);
    const hasChildren = isObjectType(namedType);
    const hasArgs = field.args && field.args.length > 0;
    const hasRequiredArgs = field.args?.some((a) => getTypeName(a.type).endsWith('!'));

    // Get children and sort them if needed
    const getChildren = () => {
      if (!hasChildren) return [];
      const children = Object.values((namedType as GraphQLObjectType).getFields());
      if (sortAlphabetically) {
        return [...children].sort((a, b) => a.name.localeCompare(b.name));
      }
      return children;
    };

    return (
      <div key={path} className="select-none">
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 rounded-md hover:bg-accent',
            isSelected && 'bg-accent/50'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren && depth < maxDepth ? (
            <button
              onClick={() => toggleExpand(path)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(path, field)}
            className="h-3.5 w-3.5"
          />
          <span className="text-sm font-medium flex-1">
            {field.name}
            {hasRequiredArgs && <span className="text-destructive ml-0.5">*</span>}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {getTypeName(field.type)}
          </span>
        </div>

        {/* Show argument inputs when field is selected and has args */}
        {isSelected && hasArgs && (
          <div
            className="border-l-2 border-primary/30 ml-4 py-1 space-y-1"
            style={{ marginLeft: `${depth * 16 + 24}px` }}
          >
            {field.args.map((arg) => {
              const argKey = `${path}.${arg.name}`;
              const argValue = argValues.get(argKey) || { value: '', useVariable: true };
              const isRequired = getTypeName(arg.type).endsWith('!');
              const baseTypeName = getTypeName(arg.type).replace(/[\[\]!]/g, '');

              return (
                <div key={arg.name} className="flex items-center gap-1 px-2">
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400 min-w-[80px]">
                    {arg.name}
                    {isRequired && <span className="text-destructive">*</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">:</span>
                  <Input
                    value={argValue.value}
                    onChange={(e) => updateArgValue(path, arg.name, e.target.value, argValue.useVariable)}
                    placeholder={baseTypeName}
                    className="h-6 text-xs flex-1 min-w-[100px] max-w-[150px]"
                  />
                  <button
                    onClick={() => updateArgValue(path, arg.name, argValue.value, !argValue.useVariable)}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded border',
                      argValue.useVariable
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-muted border-border text-muted-foreground'
                    )}
                    title={argValue.useVariable ? 'Using variable' : 'Inline value'}
                  >
                    {argValue.useVariable ? '$var' : 'inline'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasChildren && isExpanded && depth < maxDepth && (
          <div>
            {getChildren().map((childField) =>
              renderField(childField, `${path}.${childField.name}`, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!schema) {
    return (
      <div className="h-full flex items-center justify-center themed-bg">
        <p className="text-sm text-muted-foreground">{t('docs.noSchema')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col themed-bg">
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Select value={operationType} onValueChange={(v) => setOperationType(v as typeof operationType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="mutation">Mutation</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSortAlphabetically(!sortAlphabetically)}
            title={sortAlphabetically ? 'Schema order' : 'Alphabetical'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={generateQuery}
            disabled={selectedFields.size === 0}
          >
            {t('builder.applyToEditor')}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {selectedFields.size > 0 && (
          <div className="text-xs text-muted-foreground">
            {selectedFields.size} field(s) selected
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-xs"
              onClick={() => setSelectedFields(new Map())}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredRootFields.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              {t('builder.noFields')}
            </p>
          ) : (
            filteredRootFields.map((field) => renderField(field, field.name, 0))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
