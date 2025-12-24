import { createClient as createWsClient, type Client as WsClient } from 'graphql-ws';
import { createClient as createSseClient, type Client as SseClient } from 'graphql-sse';
import type { SubscriptionMessage, Header, AuthConfig } from '@/types';
import { interpolateString, interpolateHeaders, interpolateAuth, type InterpolationContext } from './interpolation';

export type SubscriptionProtocol = 'ws' | 'sse' | 'appsync';

export interface SubscriptionOptions {
  url: string;
  query: string;
  variables: string;
  operationName?: string;
  headers: Header[];
  auth: AuthConfig;
  protocol: SubscriptionProtocol;
  context: InterpolationContext;
  onMessage: (message: SubscriptionMessage) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  onConnected: () => void;
}

export interface SubscriptionHandle {
  unsubscribe: () => void;
}

let wsClient: WsClient | null = null;
let sseClient: SseClient | null = null;

export async function subscribe(options: SubscriptionOptions): Promise<SubscriptionHandle> {
  const url = interpolateString(options.url, options.context);
  const interpolatedHeaders = interpolateHeaders(options.headers, options.context);
  const interpolatedAuth = interpolateAuth(options.auth, options.context);

  const headers: Record<string, string> = {};
  for (const h of interpolatedHeaders) {
    if (h.enabled) {
      headers[h.key] = h.value;
    }
  }

  // Add auth headers
  if (interpolatedAuth.mode === 'bearer' && interpolatedAuth.bearer?.token) {
    headers['Authorization'] = `Bearer ${interpolatedAuth.bearer.token}`;
  } else if (interpolatedAuth.mode === 'basic' && interpolatedAuth.basic) {
    const encoded = btoa(`${interpolatedAuth.basic.username}:${interpolatedAuth.basic.password}`);
    headers['Authorization'] = `Basic ${encoded}`;
  } else if (interpolatedAuth.mode === 'api-key' && interpolatedAuth.apiKey?.addTo === 'header') {
    headers[interpolatedAuth.apiKey.key] = interpolatedAuth.apiKey.value;
  }

  let variables: Record<string, unknown> | undefined;
  try {
    variables = options.variables ? JSON.parse(interpolateString(options.variables, options.context)) : undefined;
  } catch {
    // ignore
  }

  switch (options.protocol) {
    case 'ws':
      return subscribeWebSocket(url, options, headers, variables);
    case 'sse':
      return subscribeSSE(url, options, headers, variables);
    case 'appsync':
      return subscribeAppSync(url, options, headers, variables);
    default:
      throw new Error(`Unsupported subscription protocol: ${options.protocol}`);
  }
}

function subscribeWebSocket(
  url: string,
  options: SubscriptionOptions,
  headers: Record<string, string>,
  variables?: Record<string, unknown>
): SubscriptionHandle {
  // Convert http(s) to ws(s) if needed
  const wsUrl = url.replace(/^http/, 'ws');

  wsClient = createWsClient({
    url: wsUrl,
    connectionParams: headers,
    on: {
      connected: () => {
        options.onConnected();
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'connection',
          payload: { message: 'Connected to WebSocket' },
          timestamp: Date.now(),
        });
      },
      error: (error) => {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      },
      closed: () => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'complete',
          payload: { message: 'Connection closed' },
          timestamp: Date.now(),
        });
      },
    },
  });

  const unsubscribe = wsClient.subscribe(
    {
      query: options.query,
      variables,
      operationName: options.operationName,
    },
    {
      next: (data) => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'data',
          payload: data,
          timestamp: Date.now(),
        });
      },
      error: (error) => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'error',
          payload: { message: error instanceof Error ? error.message : String(error) },
          timestamp: Date.now(),
        });
        options.onError(error instanceof Error ? error : new Error(String(error)));
      },
      complete: () => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'complete',
          payload: { message: 'Subscription completed' },
          timestamp: Date.now(),
        });
        options.onComplete();
      },
    }
  );

  return {
    unsubscribe: () => {
      unsubscribe();
      wsClient?.dispose();
      wsClient = null;
    },
  };
}

function subscribeSSE(
  url: string,
  options: SubscriptionOptions,
  headers: Record<string, string>,
  variables?: Record<string, unknown>
): SubscriptionHandle {
  sseClient = createSseClient({
    url,
    headers,
  });

  options.onConnected();
  options.onMessage({
    id: crypto.randomUUID(),
    type: 'connection',
    payload: { message: 'Connected to SSE' },
    timestamp: Date.now(),
  });

  const unsubscribe = sseClient.subscribe(
    {
      query: options.query,
      variables,
      operationName: options.operationName,
    },
    {
      next: (data) => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'data',
          payload: data,
          timestamp: Date.now(),
        });
      },
      error: (error) => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'error',
          payload: { message: error instanceof Error ? error.message : String(error) },
          timestamp: Date.now(),
        });
        options.onError(error instanceof Error ? error : new Error(String(error)));
      },
      complete: () => {
        options.onMessage({
          id: crypto.randomUUID(),
          type: 'complete',
          payload: { message: 'Subscription completed' },
          timestamp: Date.now(),
        });
        options.onComplete();
      },
    }
  );

  return {
    unsubscribe: () => {
      unsubscribe();
      sseClient?.dispose();
      sseClient = null;
    },
  };
}

// AppSync adapter stub - can be extended for full AppSync support
function subscribeAppSync(
  url: string,
  options: SubscriptionOptions,
  headers: Record<string, string>,
  variables?: Record<string, unknown>
): SubscriptionHandle {
  // AppSync uses a specific WebSocket subprotocol
  // This is a stub implementation that can be extended

  options.onMessage({
    id: crypto.randomUUID(),
    type: 'error',
    payload: {
      message: 'AppSync subscriptions require additional configuration. Please use the WebSocket or SSE protocol, or implement a custom AppSync adapter.',
    },
    timestamp: Date.now(),
  });

  options.onError(new Error('AppSync adapter not fully implemented'));

  return {
    unsubscribe: () => {},
  };
}

export function disconnectAll(): void {
  if (wsClient) {
    wsClient.dispose();
    wsClient = null;
  }
  if (sseClient) {
    sseClient.dispose();
    sseClient = null;
  }
}
