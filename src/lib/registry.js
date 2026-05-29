import { allActions } from './actions/index.js';

export const createActionRegistry = (customActions = {}) => {
  const actions = new Map(Object.entries(allActions));

  for (const [name, action] of Object.entries(customActions)) {
    if (typeof action !== 'function') throw new Error(`La accion personalizada ${name} debe ser una funcion`);
    actions.set(name, action);
  }

  return {
    get(name) {
      return actions.get(name);
    },

    has(name) {
      return actions.has(name);
    },

    register(name, action) {
      if (!name || typeof name !== 'string') throw new Error('register requiere un nombre string');
      if (typeof action !== 'function') throw new Error(`La accion ${name} debe ser una funcion`);
      actions.set(name, action);
      return action;
    },

    list() {
      return [...actions.keys()].sort();
    },

    entries() {
      return [...actions.entries()];
    }
  };
};
