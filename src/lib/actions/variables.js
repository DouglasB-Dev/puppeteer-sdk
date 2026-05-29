export const variableActions = {
  async setVariable({ step, context }) {
    const { name, value } = step;
    context.setVariable(name, value);
    return { action: 'setVariable', name, value };
  },

  async setData({ step, context }) {
    const { name, value } = step;
    context.set(name, value);
    return { action: 'setData', name, value };
  }
};
