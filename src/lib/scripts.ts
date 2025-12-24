import type { ScriptResult, GraphQLResponse, EnvVariable, Header } from '@/types';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    // Create inline worker since we can't easily import worker files in Next.js
    const workerCode = `
      const logs = [];
      let envOverrides = {};
      let varsOverrides = {};
      let headersOverrides = {};

      function createSandboxAPI(env, vars, response) {
        return {
          env: {
            get: (name) => {
              if (name in envOverrides) return envOverrides[name];
              return env[name];
            },
            set: (name, value) => {
              envOverrides[name] = value;
            },
          },
          vars: {
            get: () => ({ ...vars, ...varsOverrides }),
            set: (obj) => {
              varsOverrides = { ...varsOverrides, ...obj };
            },
          },
          headers: {
            set: (key, value) => {
              headersOverrides[key] = value;
            },
          },
          log: (...args) => {
            logs.push(args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          },
          response: response,
        };
      }

      function executeScript(script, api) {
        const fn = new Function(
          'env',
          'vars',
          'headers',
          'log',
          'response',
          '"use strict";\\n' + script
        );
        fn(api.env, api.vars, api.headers, api.log, api.response);
      }

      self.onmessage = (event) => {
        const { script, env, vars, headers, response, timeout } = event.data;

        logs.length = 0;
        envOverrides = {};
        varsOverrides = {};
        headersOverrides = { ...headers };

        const api = createSandboxAPI(env, vars, response);

        const timeoutId = setTimeout(() => {
          self.postMessage({
            success: false,
            logs: [...logs],
            envOverrides,
            varsOverrides,
            headersOverrides,
            error: 'Script execution timed out',
          });
        }, timeout);

        try {
          executeScript(script, api);
          clearTimeout(timeoutId);

          self.postMessage({
            success: true,
            logs: [...logs],
            envOverrides,
            varsOverrides,
            headersOverrides,
          });
        } catch (error) {
          clearTimeout(timeoutId);

          self.postMessage({
            success: false,
            logs: [...logs],
            envOverrides,
            varsOverrides,
            headersOverrides,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
  }
  return worker;
}

export async function runPreRequestScript(
  script: string,
  envVariables: EnvVariable[],
  variables: string,
  headers: Header[],
  timeout: number
): Promise<ScriptResult> {
  if (!script.trim()) {
    return {
      success: true,
      logs: [],
      envOverrides: {},
      varsOverrides: {},
      headersOverrides: {},
    };
  }

  const env: Record<string, unknown> = {};
  for (const v of envVariables) {
    env[v.name] = v.value;
  }

  let vars: Record<string, unknown> = {};
  try {
    vars = JSON.parse(variables);
  } catch {
    // ignore
  }

  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    if (h.enabled) {
      headerMap[h.key] = h.value;
    }
  }

  return new Promise((resolve) => {
    const w = getWorker();

    const handleMessage = (event: MessageEvent<ScriptResult>) => {
      w.removeEventListener('message', handleMessage);
      resolve(event.data);
    };

    w.addEventListener('message', handleMessage);

    w.postMessage({
      type: 'execute',
      script,
      env,
      vars,
      headers: headerMap,
      timeout,
    });
  });
}

export async function runPostRequestScript(
  script: string,
  envVariables: EnvVariable[],
  variables: string,
  headers: Header[],
  response: GraphQLResponse,
  timeout: number
): Promise<ScriptResult> {
  if (!script.trim()) {
    return {
      success: true,
      logs: [],
      envOverrides: {},
      varsOverrides: {},
      headersOverrides: {},
    };
  }

  const env: Record<string, unknown> = {};
  for (const v of envVariables) {
    env[v.name] = v.value;
  }

  let vars: Record<string, unknown> = {};
  try {
    vars = JSON.parse(variables);
  } catch {
    // ignore
  }

  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    if (h.enabled) {
      headerMap[h.key] = h.value;
    }
  }

  return new Promise((resolve) => {
    const w = getWorker();

    const handleMessage = (event: MessageEvent<ScriptResult>) => {
      w.removeEventListener('message', handleMessage);
      resolve(event.data);
    };

    w.addEventListener('message', handleMessage);

    w.postMessage({
      type: 'execute',
      script,
      env,
      vars,
      headers: headerMap,
      response,
      timeout,
    });
  });
}

