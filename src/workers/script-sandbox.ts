// Script Sandbox Worker
// This runs user scripts in isolation with a limited API

interface ScriptMessage {
  type: 'execute';
  script: string;
  env: Record<string, unknown>;
  vars: Record<string, unknown>;
  headers: Record<string, string>;
  response?: unknown;
  timeout: number;
}

interface ScriptResult {
  success: boolean;
  logs: string[];
  envOverrides: Record<string, unknown>;
  varsOverrides: Record<string, unknown>;
  headersOverrides: Record<string, string>;
  error?: string;
}

const logs: string[] = [];
let envOverrides: Record<string, unknown> = {};
let varsOverrides: Record<string, unknown> = {};
let headersOverrides: Record<string, string> = {};

function createSandboxAPI(env: Record<string, unknown>, vars: Record<string, unknown>, response?: unknown) {
  return {
    env: {
      get: (name: string): unknown => {
        if (name in envOverrides) return envOverrides[name];
        return env[name];
      },
      set: (name: string, value: unknown): void => {
        envOverrides[name] = value;
      },
    },
    vars: {
      get: (): Record<string, unknown> => {
        return { ...vars, ...varsOverrides };
      },
      set: (obj: Record<string, unknown>): void => {
        varsOverrides = { ...varsOverrides, ...obj };
      },
    },
    headers: {
      set: (key: string, value: string): void => {
        headersOverrides[key] = value;
      },
    },
    log: (...args: unknown[]): void => {
      logs.push(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    },
    response: response,
  };
}

function executeScript(script: string, api: ReturnType<typeof createSandboxAPI>): void {
  // Create a function with the sandbox API available
  const fn = new Function(
    'env',
    'vars',
    'headers',
    'log',
    'response',
    `"use strict";
    ${script}`
  );

  fn(api.env, api.vars, api.headers, api.log, api.response);
}

self.onmessage = (event: MessageEvent<ScriptMessage>) => {
  const { script, env, vars, headers, response, timeout } = event.data;

  // Reset state
  logs.length = 0;
  envOverrides = {};
  varsOverrides = {};
  headersOverrides = { ...headers };

  const api = createSandboxAPI(env, vars, response);

  // Set up timeout
  const timeoutId = setTimeout(() => {
    const result: ScriptResult = {
      success: false,
      logs,
      envOverrides,
      varsOverrides,
      headersOverrides,
      error: 'Script execution timed out',
    };
    self.postMessage(result);
  }, timeout);

  try {
    executeScript(script, api);
    clearTimeout(timeoutId);

    const result: ScriptResult = {
      success: true,
      logs,
      envOverrides,
      varsOverrides,
      headersOverrides,
    };
    self.postMessage(result);
  } catch (error) {
    clearTimeout(timeoutId);

    const result: ScriptResult = {
      success: false,
      logs,
      envOverrides,
      varsOverrides,
      headersOverrides,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(result);
  }
};

export {};
