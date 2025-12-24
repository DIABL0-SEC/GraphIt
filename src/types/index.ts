// Core Types for GraphIt

export type AuthMode = 'none' | 'bearer' | 'basic' | 'api-key';

export interface AuthConfig {
  mode: AuthMode;
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
}

export interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvVariable {
  id: string;
  name: string;
  value: string | number | boolean | object;
  isSecret: boolean;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: EnvVariable[];
  createdAt: number;
  updatedAt: number;
}

export interface FileMapping {
  id: string;
  variablePath: string;
  file: File | null;
  fileName: string;
}

export interface Tab {
  id: string;
  workspaceId: string;
  name: string;
  query: string;
  variables: string;
  headers: Header[];
  auth: AuthConfig;
  endpoint: string;
  useWorkspaceEndpoint: boolean;
  preRequestScript: string;
  postRequestScript: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  fileMappings: FileMapping[];
  subscriptionUrl: string;
  subscriptionProtocol: 'ws' | 'sse' | 'appsync';
  notes: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  defaultEndpoint: string;
  defaultHeaders: Header[];
  activeTabId: string | null;
  activeEnvironmentId: string | null;
  schemaAutoRefresh: boolean;
  schemaRefreshInterval: number;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface SchemaCache {
  id: string;
  workspaceId: string;
  environmentId: string | null;
  endpoint: string;
  schemaSDL: string;
  introspectionResult: string;
  cachedAt: number;
}

export interface HistoryEntry {
  id: string;
  workspaceId: string;
  environmentId: string | null;
  endpoint: string;
  query: string;
  variables: string;
  operationName: string | null;
  status: number;
  duration: number;
  timestamp: number;
  responseSize: number;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  parentId: string | null;
  type: 'folder' | 'item';
  name: string;
  query?: string;
  variables?: string;
  headers?: Header[];
  auth?: AuthConfig;
  notes?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  theme: 'light' | 'dark';
  language: 'en' | 'es';
  editorFontSize: number;
  editorTabSize: number;
  editorMinimap: boolean;
  proxyMode: boolean;
  defaultHttpMethod: 'GET' | 'POST';
  requestTimeout: number;
  enableBatching: boolean;
  scriptTimeout: number;
}

export interface ResponseStats {
  status: number;
  statusText: string;
  duration: number;
  size: number;
  timestamp: number;
}

export interface ResponseHeader {
  key: string;
  value: string;
}

export interface GraphQLResponse {
  data?: unknown;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
  }>;
  extensions?: Record<string, unknown>;
}

export interface RequestResult {
  response: GraphQLResponse | null;
  headers: ResponseHeader[];
  stats: ResponseStats | null;
  error: string | null;
}

export interface SubscriptionMessage {
  id: string;
  type: 'data' | 'error' | 'complete' | 'connection';
  payload: unknown;
  timestamp: number;
}

export interface ScriptContext {
  env: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
  vars: {
    get: () => Record<string, unknown>;
    set: (obj: Record<string, unknown>) => void;
  };
  headers: {
    set: (key: string, value: string) => void;
  };
  log: (...args: unknown[]) => void;
  response?: GraphQLResponse;
}

export interface ScriptResult {
  success: boolean;
  logs: string[];
  envOverrides: Record<string, unknown>;
  varsOverrides: Record<string, unknown>;
  headersOverrides: Record<string, string>;
  error?: string;
}

export interface ExportData {
  version: string;
  type: 'workspace' | 'collection' | 'item';
  data: unknown;
  includeSecrets: boolean;
  exportedAt: number;
}

export interface BuilderField {
  name: string;
  type: string;
  isSelected: boolean;
  args: BuilderArgument[];
  children: BuilderField[];
  depth: number;
  isExpanded: boolean;
}

export interface BuilderArgument {
  name: string;
  type: string;
  isRequired: boolean;
  isIncluded: boolean;
  value: string;
  useVariable: boolean;
  variableName: string;
}

export interface BuilderState {
  operationType: 'query' | 'mutation' | 'subscription';
  rootField: string;
  fields: BuilderField[];
  variables: Array<{
    name: string;
    type: string;
    isIncluded: boolean;
  }>;
}
