const PATH_TOKEN = /\[(\d+)\]/g;
const TEMPLATE_TOKEN = /\$\{([^}]+)\}/g;

const normalizePath = (path) => String(path).replace(PATH_TOKEN, '.$1').split('.').filter(Boolean);

export const getByPath = (source, path, fallback = undefined) => {
  if (source == null || path == null || path === '') return fallback;

  const parts = normalizePath(path);
  let current = source;

  for (const part of parts) {
    if (current == null) return fallback;
    if (current instanceof Map) {
      current = current.get(part);
    } else {
      current = current[part];
    }
  }

  return current === undefined ? fallback : current;
};

export const setByPath = (target, path, value) => {
  const parts = normalizePath(path);
  if (parts.length === 0) return value;

  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (current[part] == null || typeof current[part] !== 'object') current[part] = {};
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return value;
};

const readToken = (token, context) => {
  const key = token.trim();

  if (key.startsWith('env.')) return getByPath(process.env, key.slice(4));
  if (key.startsWith('variables.')) return getByPath(context.variables, key.slice(10));
  if (key.startsWith('vars.')) return getByPath(context.variables, key.slice(5));
  if (key.startsWith('data.')) return getByPath(context.data, key.slice(5));
  if (key.startsWith('lastResult.')) return getByPath(context.getLastResult?.(), key.slice(11));
  if (key === 'lastResult') return context.getLastResult?.();

  const variableValue = getByPath(context.variables, key);
  if (variableValue !== undefined) return variableValue;

  if (context.data instanceof Map && context.data.has(key)) return context.data.get(key);

  return getByPath(context.data, key);
};

export const interpolateString = (value, context) => {
  const exact = value.match(/^\$\{([^}]+)\}$/);
  if (exact) return readToken(exact[1], context);

  return value.replace(TEMPLATE_TOKEN, (_, token) => {
    const replacement = readToken(token, context);
    if (replacement == null) return '';
    if (typeof replacement === 'object') return JSON.stringify(replacement);
    return String(replacement);
  });
};

export const interpolateValue = (value, context) => {
  if (typeof value === 'string') return interpolateString(value, context);
  if (typeof value === 'function') return value;
  if (value instanceof RegExp) return value;
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => interpolateValue(item, context));

  if (typeof value === 'object') {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value;
    const output = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = interpolateValue(nestedValue, context);
    }
    return output;
  }

  return value;
};

export const serializeForOutput = (value, depth = 0) => {
  if (depth > 6) return '[MaxDepth]';
  if (value == null) return value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value instanceof RegExp) return value.toString();
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, nested]) => [key, serializeForOutput(nested, depth + 1)]));
  }
  if (Array.isArray(value)) return value.map((item) => serializeForOutput(item, depth + 1));
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeForOutput(nested, depth + 1)]));
  }
  return value;
};
