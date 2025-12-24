import Dexie, { Table } from 'dexie';
import type {
  Workspace,
  Tab,
  Environment,
  SchemaCache,
  HistoryEntry,
  Collection,
  CollectionItem,
  Settings,
} from '@/types';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'en',
  editorFontSize: 14,
  editorTabSize: 2,
  editorMinimap: false,
  proxyMode: false,
  defaultHttpMethod: 'POST',
  requestTimeout: 30000,
  enableBatching: false,
  scriptTimeout: 2000,
};

export class GraphItDatabase extends Dexie {
  workspaces!: Table<Workspace, string>;
  tabs!: Table<Tab, string>;
  environments!: Table<Environment, string>;
  schemaCache!: Table<SchemaCache, string>;
  history!: Table<HistoryEntry, string>;
  collections!: Table<Collection, string>;
  collectionItems!: Table<CollectionItem, string>;

  constructor() {
    super('GraphItDB');

    this.version(1).stores({
      workspaces: 'id, name, order, createdAt',
      tabs: 'id, workspaceId, order, createdAt',
      environments: 'id, workspaceId, name, createdAt',
      schemaCache: 'id, [workspaceId+environmentId+endpoint], cachedAt',
      history: 'id, workspaceId, timestamp, operationName',
      collections: 'id, workspaceId, order, createdAt',
      collectionItems: 'id, collectionId, parentId, order, createdAt',
    });
  }
}

export const db = new GraphItDatabase();

// Settings stored in localStorage for simplicity
export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  const stored = localStorage.getItem('graphit-settings');
  if (!stored) return DEFAULT_SETTINGS;

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('graphit-settings', JSON.stringify(updated));
  return updated;
}

// Active workspace stored in localStorage
export function getActiveWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('graphit-active-workspace');
}

export function setActiveWorkspaceId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem('graphit-active-workspace', id);
  } else {
    localStorage.removeItem('graphit-active-workspace');
  }
}

// Initialize database with default workspace if empty
export async function initializeDatabase(): Promise<void> {
  const workspaces = await db.workspaces.count();

  if (workspaces === 0) {
    const now = Date.now();
    const workspaceId = crypto.randomUUID();
    const tabId = crypto.randomUUID();
    const envId = crypto.randomUUID();

    await db.workspaces.add({
      id: workspaceId,
      name: 'Default Workspace',
      defaultEndpoint: 'https://api.example.com/graphql',
      defaultHeaders: [],
      activeTabId: tabId,
      activeEnvironmentId: envId,
      schemaAutoRefresh: false,
      schemaRefreshInterval: 60,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    await db.tabs.add({
      id: tabId,
      workspaceId,
      name: 'New Query',
      query: `# Welcome to GraphIt!
# Start by setting your endpoint above and writing a query.

query ExampleQuery {
  __typename
}
`,
      variables: '{}',
      headers: [],
      auth: { mode: 'none' },
      endpoint: '',
      useWorkspaceEndpoint: true,
      preRequestScript: '',
      postRequestScript: '',
      httpMethod: 'POST',
      fileMappings: [],
      subscriptionUrl: '',
      subscriptionProtocol: 'ws',
      notes: '',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    await db.environments.add({
      id: envId,
      workspaceId,
      name: 'Local',
      variables: [
        {
          id: crypto.randomUUID(),
          name: 'API_URL',
          value: 'http://localhost:4000/graphql',
          isSecret: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    setActiveWorkspaceId(workspaceId);
  }
}

// Workspace operations
export async function createWorkspace(name: string): Promise<Workspace> {
  const now = Date.now();
  const maxOrder = await db.workspaces.orderBy('order').last();
  const id = crypto.randomUUID();
  const tabId = crypto.randomUUID();

  const workspace: Workspace = {
    id,
    name,
    defaultEndpoint: '',
    defaultHeaders: [],
    activeTabId: tabId,
    activeEnvironmentId: null,
    schemaAutoRefresh: false,
    schemaRefreshInterval: 60,
    order: (maxOrder?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.workspaces.add(workspace);

  await db.tabs.add({
    id: tabId,
    workspaceId: id,
    name: 'New Query',
    query: '',
    variables: '{}',
    headers: [],
    auth: { mode: 'none' },
    endpoint: '',
    useWorkspaceEndpoint: true,
    preRequestScript: '',
    postRequestScript: '',
    httpMethod: 'POST',
    fileMappings: [],
    subscriptionUrl: '',
    subscriptionProtocol: 'ws',
    notes: '',
    order: 0,
    createdAt: now,
    updatedAt: now,
  });

  return workspace;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await db.transaction('rw', [db.workspaces, db.tabs, db.environments, db.schemaCache, db.history, db.collections, db.collectionItems], async () => {
    await db.tabs.where('workspaceId').equals(id).delete();
    await db.environments.where('workspaceId').equals(id).delete();
    await db.schemaCache.where('workspaceId').equals(id).delete();
    await db.history.where('workspaceId').equals(id).delete();

    const collections = await db.collections.where('workspaceId').equals(id).toArray();
    for (const col of collections) {
      await db.collectionItems.where('collectionId').equals(col.id).delete();
    }
    await db.collections.where('workspaceId').equals(id).delete();

    await db.workspaces.delete(id);
  });
}

// Tab operations
export async function createTab(workspaceId: string, name?: string): Promise<Tab> {
  const now = Date.now();
  const maxOrder = await db.tabs.where('workspaceId').equals(workspaceId).last();
  const settings = getSettings();

  const tab: Tab = {
    id: crypto.randomUUID(),
    workspaceId,
    name: name ?? 'New Query',
    query: '',
    variables: '{}',
    headers: [],
    auth: { mode: 'none' },
    endpoint: '',
    useWorkspaceEndpoint: true,
    preRequestScript: '',
    postRequestScript: '',
    httpMethod: settings.defaultHttpMethod,
    fileMappings: [],
    subscriptionUrl: '',
    subscriptionProtocol: 'ws',
    notes: '',
    order: (maxOrder?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.tabs.add(tab);
  await db.workspaces.update(workspaceId, { activeTabId: tab.id, updatedAt: now });

  return tab;
}

export async function duplicateTab(tabId: string): Promise<Tab> {
  const original = await db.tabs.get(tabId);
  if (!original) throw new Error('Tab not found');

  const now = Date.now();
  const maxOrder = await db.tabs.where('workspaceId').equals(original.workspaceId).last();

  const tab: Tab = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} (copy)`,
    order: (maxOrder?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.tabs.add(tab);
  await db.workspaces.update(original.workspaceId, { activeTabId: tab.id, updatedAt: now });

  return tab;
}

export async function deleteTab(tabId: string): Promise<void> {
  const tab = await db.tabs.get(tabId);
  if (!tab) return;

  const workspaceTabs = await db.tabs.where('workspaceId').equals(tab.workspaceId).toArray();
  if (workspaceTabs.length <= 1) {
    throw new Error('Cannot delete the last tab');
  }

  await db.tabs.delete(tabId);

  const workspace = await db.workspaces.get(tab.workspaceId);
  if (workspace?.activeTabId === tabId) {
    const remaining = workspaceTabs.filter(t => t.id !== tabId);
    await db.workspaces.update(tab.workspaceId, {
      activeTabId: remaining[0]?.id ?? null,
      updatedAt: Date.now(),
    });
  }
}

// History operations
export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> {
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
  };
  await db.history.add(full);
  return full;
}

export async function clearHistory(workspaceId: string): Promise<void> {
  await db.history.where('workspaceId').equals(workspaceId).delete();
}

// Schema cache operations
export async function cacheSchema(
  workspaceId: string,
  environmentId: string | null,
  endpoint: string,
  schemaSDL: string,
  introspectionResult: string
): Promise<void> {
  const existing = await db.schemaCache
    .where('[workspaceId+environmentId+endpoint]')
    .equals([workspaceId, environmentId ?? '', endpoint])
    .first();

  const now = Date.now();

  if (existing) {
    await db.schemaCache.update(existing.id, {
      schemaSDL,
      introspectionResult,
      cachedAt: now,
    });
  } else {
    await db.schemaCache.add({
      id: crypto.randomUUID(),
      workspaceId,
      environmentId,
      endpoint,
      schemaSDL,
      introspectionResult,
      cachedAt: now,
    });
  }
}

export async function getCachedSchema(
  workspaceId: string,
  environmentId: string | null,
  endpoint: string
): Promise<SchemaCache | undefined> {
  return db.schemaCache
    .where('[workspaceId+environmentId+endpoint]')
    .equals([workspaceId, environmentId ?? '', endpoint])
    .first();
}

export async function clearSchemaCache(workspaceId: string): Promise<void> {
  await db.schemaCache.where('workspaceId').equals(workspaceId).delete();
}

// Collection operations
export async function createCollection(workspaceId: string, name: string): Promise<Collection> {
  const now = Date.now();
  const maxOrder = await db.collections.where('workspaceId').equals(workspaceId).last();

  const collection: Collection = {
    id: crypto.randomUUID(),
    workspaceId,
    name,
    order: (maxOrder?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.collections.add(collection);
  return collection;
}

export async function deleteCollection(id: string): Promise<void> {
  await db.transaction('rw', [db.collections, db.collectionItems], async () => {
    await db.collectionItems.where('collectionId').equals(id).delete();
    await db.collections.delete(id);
  });
}

export async function addCollectionItem(item: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CollectionItem> {
  const now = Date.now();
  const full: CollectionItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.collectionItems.add(full);
  return full;
}
