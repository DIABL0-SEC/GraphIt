import type { EnvVariable, Header, AuthConfig } from '@/types';

export interface InterpolationContext {
  variables: Record<string, unknown>;
}

export function buildInterpolationContext(envVariables: EnvVariable[]): InterpolationContext {
  const variables: Record<string, unknown> = {};
  for (const v of envVariables) {
    variables[v.name] = v.value;
  }
  return { variables };
}

export function interpolateString(
  template: string,
  context: InterpolationContext
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const name = varName.trim();
    const value = context.variables[name];
    if (value === undefined) return match;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

export function interpolateHeaders(
  headers: Header[],
  context: InterpolationContext
): Header[] {
  return headers.map(h => ({
    ...h,
    key: interpolateString(h.key, context),
    value: interpolateString(h.value, context),
  }));
}

export function interpolateVariablesJSON(
  variablesStr: string,
  context: InterpolationContext
): string {
  const interpolated = interpolateString(variablesStr, context);
  try {
    JSON.parse(interpolated);
    return interpolated;
  } catch {
    return variablesStr;
  }
}

export function interpolateAuth(
  auth: AuthConfig,
  context: InterpolationContext
): AuthConfig {
  const result: AuthConfig = { mode: auth.mode };

  if (auth.bearer) {
    result.bearer = {
      token: interpolateString(auth.bearer.token, context),
    };
  }

  if (auth.basic) {
    result.basic = {
      username: interpolateString(auth.basic.username, context),
      password: interpolateString(auth.basic.password, context),
    };
  }

  if (auth.apiKey) {
    result.apiKey = {
      key: interpolateString(auth.apiKey.key, context),
      value: interpolateString(auth.apiKey.value, context),
      addTo: auth.apiKey.addTo,
    };
  }

  return result;
}

export function extractVariableNames(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const names: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    const name = match[1].trim();
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

export function validateInterpolation(
  template: string,
  context: InterpolationContext
): { valid: boolean; missingVars: string[] } {
  const names = extractVariableNames(template);
  const missingVars = names.filter(name => !(name in context.variables));
  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}
