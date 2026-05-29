import { getByPath, serializeForOutput, setByPath } from './utils/interpolate.js';

export const createContext = ({ page = null, variables = {}, data = {}, meta = {} } = {}) => {
  const store = data instanceof Map ? data : new Map(Object.entries(data));
  const results = [];
  const artifacts = [];
  const consoleMessages = [];

  const context = {
    page,
    data: store,
    variables: { ...variables },
    results,
    artifacts,
    consoleMessages,
    meta: { ...meta },

    set(key, value) {
      store.set(key, value);
      return value;
    },

    setPath(path, value) {
      if (String(path).startsWith('variables.')) return setByPath(this.variables, String(path).slice(10), value);
      if (String(path).startsWith('vars.')) return setByPath(this.variables, String(path).slice(5), value);
      if (String(path).startsWith('data.')) return this.set(String(path).slice(5), value);
      return this.set(path, value);
    },

    get(key, fallback = undefined) {
      if (store.has(key)) return store.get(key);
      const dataValue = getByPath(store, key);
      if (dataValue !== undefined) return dataValue;
      const variableValue = getByPath(this.variables, key);
      return variableValue === undefined ? fallback : variableValue;
    },

    has(key) {
      return this.get(key) !== undefined;
    },

    setVariable(name, value) {
      setByPath(this.variables, name, value);
      return value;
    },

    getVariable(name, fallback = undefined) {
      return getByPath(this.variables, name, fallback);
    },

    addResult(result) {
      results.push(result);
      this.set('lastResult', result);
      this.variables.lastResult = result;
      return result;
    },

    addArtifact(artifact) {
      artifacts.push(artifact);
      return artifact;
    },

    addConsole(entry) {
      const record = {
        timestamp: new Date().toISOString(),
        ...entry
      };
      consoleMessages.push(record);
      return record;
    },

    getLastResult() {
      return results[results.length - 1];
    },

    clearData() {
      store.clear();
    },

    toJSON() {
      return {
        data: serializeForOutput(store),
        variables: serializeForOutput(this.variables),
        artifacts: serializeForOutput(artifacts),
        console: serializeForOutput(consoleMessages),
        resultsCount: results.length
      };
    }
  };

  return context;
};
