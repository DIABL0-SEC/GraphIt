import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Workspace,
  Tab,
  Environment,
  Settings,
  RequestResult,
  HistoryEntry,
  Collection,
  CollectionItem,
  SubscriptionMessage,
  SchemaCache,
  ScriptResult,
} from '@/types';
import { db, getSettings, saveSettings, getActiveWorkspaceId, setActiveWorkspaceId, initializeDatabase } from '@/db';
import type { GraphQLSchema } from 'graphql';

interface AppState {
  // Initialization
  initialized: boolean;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // Environments
  environments: Environment[];
  activeEnvironmentId: string | null;

  // Settings
  settings: Settings;

  // Schema
  schemaCache: Map<string, GraphQLSchema>;
  schemaLoading: boolean;
  schemaError: string | null;

  // Request state
  requestLoading: boolean;
  requestResult: RequestResult | null;

  // Subscription state
  subscriptionActive: boolean;
  subscriptionMessages: SubscriptionMessage[];
  subscriptionPaused: boolean;

  // Script console
  scriptLogs: string[];

  // History
  history: HistoryEntry[];

  // Collections
  collections: Collection[];
  collectionItems: CollectionItem[];

  // UI state
  sidebarSection: 'workspaces' | 'collections' | 'history' | 'settings';
  rightPanelSection: 'docs' | 'builder';
  showRightPanel: boolean;

  // Actions
  initialize: () => Promise<void>;

  // Workspace actions
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Tab actions
  loadTabs: (workspaceId: string) => Promise<void>;
  setActiveTab: (id: string) => Promise<void>;
  createTab: () => Promise<Tab>;
  updateTab: (id: string, updates: Partial<Tab>) => Promise<void>;
  duplicateTab: (id: string) => Promise<Tab>;
  deleteTab: (id: string) => Promise<void>;
  reorderTabs: (tabs: Tab[]) => Promise<void>;

  // Environment actions
  loadEnvironments: (workspaceId: string) => Promise<void>;
  setActiveEnvironment: (id: string | null) => Promise<void>;
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;

  // Request actions
  setRequestLoading: (loading: boolean) => void;
  setRequestResult: (result: RequestResult | null) => void;
  clearResult: () => void;

  // Schema actions
  setSchema: (endpoint: string, schema: GraphQLSchema) => void;
  setSchemaLoading: (loading: boolean) => void;
  setSchemaError: (error: string | null) => void;
  clearSchemaCache: () => void;

  // Subscription actions
  setSubscriptionActive: (active: boolean) => void;
  addSubscriptionMessage: (message: SubscriptionMessage) => void;
  clearSubscriptionMessages: () => void;
  toggleSubscriptionPaused: () => void;

  // Script actions
  addScriptLog: (log: string) => void;
  clearScriptLogs: () => void;

  // History actions
  loadHistory: (workspaceId: string) => Promise<void>;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => Promise<void>;
  clearHistory: () => Promise<void>;

  // Collection actions
  loadCollections: (workspaceId: string) => Promise<void>;
  createCollection: (name: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  addCollectionItem: (item: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CollectionItem>;
  updateCollectionItem: (id: string, updates: Partial<CollectionItem>) => Promise<void>;
  deleteCollectionItem: (id: string) => Promise<void>;

  // UI actions
  setSidebarSection: (section: AppState['sidebarSection']) => void;
  setRightPanelSection: (section: AppState['rightPanelSection']) => void;
  toggleRightPanel: () => void;
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    initialized: false,
    workspaces: [],
    activeWorkspaceId: null,
    tabs: [],
    activeTabId: null,
    environments: [],
    activeEnvironmentId: null,
    settings: getSettings(),
    schemaCache: new Map(),
    schemaLoading: false,
    schemaError: null,
    requestLoading: false,
    requestResult: null,
    subscriptionActive: false,
    subscriptionMessages: [],
    subscriptionPaused: false,
    scriptLogs: [],
    history: [],
    collections: [],
    collectionItems: [],
    sidebarSection: 'workspaces',
    rightPanelSection: 'docs',
    showRightPanel: true,

    initialize: async () => {
      await initializeDatabase();
      const state = get();
      await state.loadWorkspaces();

      const activeId = getActiveWorkspaceId();
      const workspaces = get().workspaces;

      if (activeId && workspaces.find(w => w.id === activeId)) {
        await state.setActiveWorkspace(activeId);
      } else if (workspaces.length > 0) {
        await state.setActiveWorkspace(workspaces[0].id);
      }

      set({ initialized: true });
    },

    // Workspace actions
    loadWorkspaces: async () => {
      const workspaces = await db.workspaces.orderBy('order').toArray();
      set({ workspaces });
    },

    setActiveWorkspace: async (id) => {
      setActiveWorkspaceId(id);
      const workspace = await db.workspaces.get(id);
      if (!workspace) return;

      set({ activeWorkspaceId: id, activeEnvironmentId: workspace.activeEnvironmentId });

      const state = get();
      await Promise.all([
        state.loadTabs(id),
        state.loadEnvironments(id),
        state.loadHistory(id),
        state.loadCollections(id),
      ]);

      if (workspace.activeTabId) {
        set({ activeTabId: workspace.activeTabId });
      }
    },

    createWorkspace: async (name) => {
      const now = Date.now();
      const maxOrder = get().workspaces.reduce((max, w) => Math.max(max, w.order), -1);
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
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.workspaces.add(workspace);

      const settings = get().settings;
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
        httpMethod: settings.defaultHttpMethod,
        fileMappings: [],
        subscriptionUrl: '',
        subscriptionProtocol: 'ws',
        notes: '',
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      set(s => ({ workspaces: [...s.workspaces, workspace] }));
      return workspace;
    },

    updateWorkspace: async (id, updates) => {
      const updated = { ...updates, updatedAt: Date.now() };
      await db.workspaces.update(id, updated);
      set(s => ({
        workspaces: s.workspaces.map(w => w.id === id ? { ...w, ...updated } : w),
      }));
    },

    deleteWorkspace: async (id) => {
      await db.transaction('rw', [db.workspaces, db.tabs, db.environments, db.schemaCache, db.history, db.collections, db.collectionItems], async () => {
        await db.tabs.where('workspaceId').equals(id).delete();
        await db.environments.where('workspaceId').equals(id).delete();
        await db.schemaCache.where('workspaceId').equals(id).delete();
        await db.history.where('workspaceId').equals(id).delete();
        const cols = await db.collections.where('workspaceId').equals(id).toArray();
        for (const c of cols) {
          await db.collectionItems.where('collectionId').equals(c.id).delete();
        }
        await db.collections.where('workspaceId').equals(id).delete();
        await db.workspaces.delete(id);
      });

      const remaining = get().workspaces.filter(w => w.id !== id);
      set({ workspaces: remaining });

      if (get().activeWorkspaceId === id) {
        if (remaining.length > 0) {
          await get().setActiveWorkspace(remaining[0].id);
        } else {
          set({ activeWorkspaceId: null, tabs: [], environments: [], history: [], collections: [], collectionItems: [] });
        }
      }
    },

    // Tab actions
    loadTabs: async (workspaceId) => {
      const tabs = await db.tabs.where('workspaceId').equals(workspaceId).sortBy('order');
      set({ tabs });
    },

    setActiveTab: async (id) => {
      const workspaceId = get().activeWorkspaceId;
      if (workspaceId) {
        await db.workspaces.update(workspaceId, { activeTabId: id, updatedAt: Date.now() });
      }
      set({ activeTabId: id });
    },

    createTab: async () => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) throw new Error('No active workspace');

      const now = Date.now();
      const maxOrder = get().tabs.reduce((max, t) => Math.max(max, t.order), -1);
      const settings = get().settings;

      const tab: Tab = {
        id: crypto.randomUUID(),
        workspaceId,
        name: 'New Query',
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
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.tabs.add(tab);
      await db.workspaces.update(workspaceId, { activeTabId: tab.id, updatedAt: now });

      set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      return tab;
    },

    updateTab: async (id, updates) => {
      const updated = { ...updates, updatedAt: Date.now() };
      await db.tabs.update(id, updated);
      set(s => ({
        tabs: s.tabs.map(t => t.id === id ? { ...t, ...updated } : t),
      }));
    },

    duplicateTab: async (id) => {
      const original = get().tabs.find(t => t.id === id);
      if (!original) throw new Error('Tab not found');

      const now = Date.now();
      const maxOrder = get().tabs.reduce((max, t) => Math.max(max, t.order), -1);

      const tab: Tab = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.tabs.add(tab);
      await db.workspaces.update(original.workspaceId, { activeTabId: tab.id, updatedAt: now });

      set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      return tab;
    },

    deleteTab: async (id) => {
      const tabs = get().tabs;
      if (tabs.length <= 1) throw new Error('Cannot delete the last tab');

      await db.tabs.delete(id);
      const remaining = tabs.filter(t => t.id !== id);

      let newActiveId = get().activeTabId;
      if (newActiveId === id) {
        newActiveId = remaining[0]?.id ?? null;
        const workspaceId = get().activeWorkspaceId;
        if (workspaceId) {
          await db.workspaces.update(workspaceId, { activeTabId: newActiveId, updatedAt: Date.now() });
        }
      }

      set({ tabs: remaining, activeTabId: newActiveId });
    },

    reorderTabs: async (tabs) => {
      const updates = tabs.map((t, i) => ({ ...t, order: i }));
      await db.transaction('rw', db.tabs, async () => {
        for (const t of updates) {
          await db.tabs.update(t.id, { order: t.order });
        }
      });
      set({ tabs: updates });
    },

    // Environment actions
    loadEnvironments: async (workspaceId) => {
      const environments = await db.environments.where('workspaceId').equals(workspaceId).toArray();
      set({ environments });
    },

    setActiveEnvironment: async (id) => {
      const workspaceId = get().activeWorkspaceId;
      if (workspaceId) {
        await db.workspaces.update(workspaceId, { activeEnvironmentId: id, updatedAt: Date.now() });
      }
      set({ activeEnvironmentId: id });
    },

    createEnvironment: async (name) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) throw new Error('No active workspace');

      const now = Date.now();
      const env: Environment = {
        id: crypto.randomUUID(),
        workspaceId,
        name,
        variables: [],
        createdAt: now,
        updatedAt: now,
      };

      await db.environments.add(env);
      set(s => ({ environments: [...s.environments, env] }));
      return env;
    },

    updateEnvironment: async (id, updates) => {
      const updated = { ...updates, updatedAt: Date.now() };
      await db.environments.update(id, updated);
      set(s => ({
        environments: s.environments.map(e => e.id === id ? { ...e, ...updated } : e),
      }));
    },

    deleteEnvironment: async (id) => {
      await db.environments.delete(id);
      set(s => ({
        environments: s.environments.filter(e => e.id !== id),
        activeEnvironmentId: s.activeEnvironmentId === id ? null : s.activeEnvironmentId,
      }));
    },

    // Settings actions
    updateSettings: (updates) => {
      const newSettings = saveSettings(updates);
      set({ settings: newSettings });
    },

    // Request actions
    setRequestLoading: (loading) => set({ requestLoading: loading }),
    setRequestResult: (result) => set({ requestResult: result }),
    clearResult: () => set({ requestResult: null }),

    // Schema actions
    setSchema: (endpoint, schema) => {
      const cache = new Map(get().schemaCache);
      cache.set(endpoint, schema);
      set({ schemaCache: cache, schemaError: null });
    },
    setSchemaLoading: (loading) => set({ schemaLoading: loading }),
    setSchemaError: (error) => set({ schemaError: error }),
    clearSchemaCache: () => set({ schemaCache: new Map() }),

    // Subscription actions
    setSubscriptionActive: (active) => set({ subscriptionActive: active }),
    addSubscriptionMessage: (message) => {
      if (get().subscriptionPaused) return;
      set(s => ({ subscriptionMessages: [...s.subscriptionMessages, message] }));
    },
    clearSubscriptionMessages: () => set({ subscriptionMessages: [] }),
    toggleSubscriptionPaused: () => set(s => ({ subscriptionPaused: !s.subscriptionPaused })),

    // Script actions
    addScriptLog: (log) => set(s => ({ scriptLogs: [...s.scriptLogs, log] })),
    clearScriptLogs: () => set({ scriptLogs: [] }),

    // History actions
    loadHistory: async (workspaceId) => {
      const history = await db.history.where('workspaceId').equals(workspaceId).reverse().sortBy('timestamp');
      set({ history: history.slice(0, 100) });
    },

    addHistoryEntry: async (entry) => {
      const full: HistoryEntry = { ...entry, id: crypto.randomUUID() };
      await db.history.add(full);
      set(s => ({ history: [full, ...s.history].slice(0, 100) }));
    },

    clearHistory: async () => {
      const workspaceId = get().activeWorkspaceId;
      if (workspaceId) {
        await db.history.where('workspaceId').equals(workspaceId).delete();
      }
      set({ history: [] });
    },

    // Collection actions
    loadCollections: async (workspaceId) => {
      const collections = await db.collections.where('workspaceId').equals(workspaceId).sortBy('order');
      const items = await db.collectionItems.toArray();
      const relevantItems = items.filter(i => collections.some(c => c.id === i.collectionId));
      set({ collections, collectionItems: relevantItems });
    },

    createCollection: async (name) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) throw new Error('No active workspace');

      const now = Date.now();
      const maxOrder = get().collections.reduce((max, c) => Math.max(max, c.order), -1);

      const collection: Collection = {
        id: crypto.randomUUID(),
        workspaceId,
        name,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.collections.add(collection);
      set(s => ({ collections: [...s.collections, collection] }));
      return collection;
    },

    deleteCollection: async (id) => {
      await db.transaction('rw', [db.collections, db.collectionItems], async () => {
        await db.collectionItems.where('collectionId').equals(id).delete();
        await db.collections.delete(id);
      });
      set(s => ({
        collections: s.collections.filter(c => c.id !== id),
        collectionItems: s.collectionItems.filter(i => i.collectionId !== id),
      }));
    },

    addCollectionItem: async (item) => {
      const now = Date.now();
      const full: CollectionItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await db.collectionItems.add(full);
      set(s => ({ collectionItems: [...s.collectionItems, full] }));
      return full;
    },

    updateCollectionItem: async (id, updates) => {
      const updated = { ...updates, updatedAt: Date.now() };
      await db.collectionItems.update(id, updated);
      set(s => ({
        collectionItems: s.collectionItems.map(i => i.id === id ? { ...i, ...updated } : i),
      }));
    },

    deleteCollectionItem: async (id) => {
      await db.collectionItems.delete(id);
      set(s => ({ collectionItems: s.collectionItems.filter(i => i.id !== id) }));
    },

    // UI actions
    setSidebarSection: (section) => set({ sidebarSection: section }),
    setRightPanelSection: (section) => set({ rightPanelSection: section }),
    toggleRightPanel: () => set(s => ({ showRightPanel: !s.showRightPanel })),
  }))
);

// Selectors
export const useActiveWorkspace = () => {
  const workspaces = useStore(s => s.workspaces);
  const activeId = useStore(s => s.activeWorkspaceId);
  return workspaces.find(w => w.id === activeId);
};

export const useActiveTab = () => {
  const tabs = useStore(s => s.tabs);
  const activeId = useStore(s => s.activeTabId);
  return tabs.find(t => t.id === activeId);
};

export const useActiveEnvironment = () => {
  const environments = useStore(s => s.environments);
  const activeId = useStore(s => s.activeEnvironmentId);
  return environments.find(e => e.id === activeId);
};
