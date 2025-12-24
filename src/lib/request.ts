import type { Header, AuthConfig, FileMapping, RequestResult, GraphQLResponse, ResponseHeader } from '@/types';
import { interpolateString, interpolateHeaders, interpolateAuth, type InterpolationContext } from './interpolation';

export interface RequestOptions {
  endpoint: string;
  query: string;
  variables: string;
  operationName?: string;
  headers: Header[];
  auth: AuthConfig;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  fileMappings: FileMapping[];
  useProxy: boolean;
  timeout: number;
  context: InterpolationContext;
}

export async function executeRequest(options: RequestOptions): Promise<RequestResult> {
  const startTime = performance.now();

  try {
    const endpoint = interpolateString(options.endpoint, options.context);

    if (!endpoint || !isValidUrl(endpoint)) {
      throw new Error('Invalid endpoint URL');
    }

    const headers = buildHeaders(options.headers, options.auth, options.context, options.useProxy, endpoint);
    const hasFiles = options.fileMappings.some(m => m.file);

    let response: Response;

    if (options.httpMethod === 'GET') {
      response = await executeGetRequest(endpoint, options, headers, options.timeout);
    } else if (hasFiles) {
      response = await executeMultipartRequest(endpoint, options, headers, options.timeout);
    } else {
      response = await executePostRequest(endpoint, options, headers, options.useProxy, options.timeout);
    }

    const duration = performance.now() - startTime;
    const responseText = await response.text();
    const size = new TextEncoder().encode(responseText).length;

    const responseHeaders: ResponseHeader[] = [];
    response.headers.forEach((value, key) => {
      responseHeaders.push({ key, value });
    });

    let parsedResponse: GraphQLResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { errors: [{ message: 'Failed to parse response as JSON' }] };
    }

    return {
      response: parsedResponse,
      headers: responseHeaders,
      stats: {
        status: response.status,
        statusText: response.statusText,
        duration,
        size,
        timestamp: Date.now(),
      },
      error: null,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      response: null,
      headers: [],
      stats: {
        status: 0,
        statusText: 'Error',
        duration,
        size: 0,
        timestamp: Date.now(),
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function buildHeaders(
  headers: Header[],
  auth: AuthConfig,
  context: InterpolationContext,
  useProxy: boolean,
  targetEndpoint: string
): Record<string, string> {
  const result: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const interpolatedHeaders = interpolateHeaders(headers, context);
  for (const h of interpolatedHeaders) {
    if (h.enabled) {
      if (useProxy) {
        result[`X-GraphIt-Header-${h.key}`] = h.value;
      } else {
        result[h.key] = h.value;
      }
    }
  }

  const interpolatedAuth = interpolateAuth(auth, context);
  const authHeader = buildAuthHeader(interpolatedAuth);

  if (authHeader) {
    if (useProxy) {
      result[`X-GraphIt-Header-${authHeader.key}`] = authHeader.value;
    } else {
      result[authHeader.key] = authHeader.value;
    }
  }

  if (useProxy) {
    result['X-GraphIt-Target'] = targetEndpoint;
  }

  return result;
}

function buildAuthHeader(auth: AuthConfig): { key: string; value: string } | null {
  switch (auth.mode) {
    case 'bearer':
      if (auth.bearer?.token) {
        return { key: 'Authorization', value: `Bearer ${auth.bearer.token}` };
      }
      break;
    case 'basic':
      if (auth.basic?.username && auth.basic?.password) {
        const encoded = btoa(`${auth.basic.username}:${auth.basic.password}`);
        return { key: 'Authorization', value: `Basic ${encoded}` };
      }
      break;
    case 'api-key':
      if (auth.apiKey?.key && auth.apiKey?.value && auth.apiKey.addTo === 'header') {
        return { key: auth.apiKey.key, value: auth.apiKey.value };
      }
      break;
  }
  return null;
}

function buildApiKeyQueryParam(auth: AuthConfig): string {
  if (auth.mode === 'api-key' && auth.apiKey?.addTo === 'query' && auth.apiKey?.key && auth.apiKey?.value) {
    return `${encodeURIComponent(auth.apiKey.key)}=${encodeURIComponent(auth.apiKey.value)}`;
  }
  return '';
}

async function executeGetRequest(
  endpoint: string,
  options: RequestOptions,
  headers: Record<string, string>,
  timeout: number
): Promise<Response> {
  const variables = interpolateString(options.variables, options.context);
  const url = new URL(options.useProxy ? '/api/proxy' : endpoint);

  if (!options.useProxy) {
    url.searchParams.set('query', options.query);
    if (variables && variables !== '{}') {
      url.searchParams.set('variables', variables);
    }
    if (options.operationName) {
      url.searchParams.set('operationName', options.operationName);
    }

    const interpolatedAuth = interpolateAuth(options.auth, options.context);
    const apiKeyParam = buildApiKeyQueryParam(interpolatedAuth);
    if (apiKeyParam) {
      const [key, value] = apiKeyParam.split('=');
      url.searchParams.set(decodeURIComponent(key), decodeURIComponent(value));
    }
  } else {
    // For proxy, send as POST with body
    headers['X-GraphIt-Method'] = 'GET';
  }

  delete headers['Content-Type'];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      method: options.useProxy ? 'POST' : 'GET',
      headers,
      body: options.useProxy ? JSON.stringify({
        query: options.query,
        variables: variables ? JSON.parse(variables) : undefined,
        operationName: options.operationName,
      }) : undefined,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executePostRequest(
  endpoint: string,
  options: RequestOptions,
  headers: Record<string, string>,
  useProxy: boolean,
  timeout: number
): Promise<Response> {
  const variables = interpolateString(options.variables, options.context);
  const url = useProxy ? '/api/proxy' : endpoint;

  let parsedVariables: Record<string, unknown> | undefined;
  try {
    parsedVariables = variables ? JSON.parse(variables) : undefined;
  } catch {
    parsedVariables = undefined;
  }

  const body = JSON.stringify({
    query: options.query,
    variables: parsedVariables,
    operationName: options.operationName,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeMultipartRequest(
  endpoint: string,
  options: RequestOptions,
  headers: Record<string, string>,
  timeout: number
): Promise<Response> {
  // GraphQL multipart request spec implementation
  const variables = interpolateString(options.variables, options.context);
  let parsedVariables: Record<string, unknown> = {};
  try {
    parsedVariables = variables ? JSON.parse(variables) : {};
  } catch {
    // ignore
  }

  const formData = new FormData();
  const map: Record<string, string[]> = {};
  const fileList: File[] = [];

  for (const mapping of options.fileMappings) {
    if (mapping.file) {
      const index = fileList.length;
      fileList.push(mapping.file);
      map[index.toString()] = [`variables.${mapping.variablePath}`];

      // Set the variable to null as per spec
      setNestedValue(parsedVariables, mapping.variablePath, null);
    }
  }

  const operations = JSON.stringify({
    query: options.query,
    variables: parsedVariables,
    operationName: options.operationName,
  });

  formData.append('operations', operations);
  formData.append('map', JSON.stringify(map));

  for (let i = 0; i < fileList.length; i++) {
    formData.append(i.toString(), fileList[i]);
  }

  // Remove Content-Type to let browser set it with boundary
  delete headers['Content-Type'];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

