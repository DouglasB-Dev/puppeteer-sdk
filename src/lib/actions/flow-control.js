import { evaluateCondition } from '../utils/evaluate-condition.js';

export const flowControlActions = {
  async conditional({ page, step, context, handler, options }) {
    const { condition, then: thenSteps = [], else: elseSteps = [], args = [] } = step;
    const conditionResult = await evaluateCondition({ page, context, condition, args });
    const selectedSteps = conditionResult ? thenSteps : elseSteps;

    const nestedResult = await handler.executeSteps(page, selectedSteps ?? [], {
      ...options,
      context,
      nested: true
    });

    return {
      action: 'conditional',
      conditionResult,
      executedBranch: conditionResult ? 'then' : 'else',
      nested: nestedResult.results
    };
  },

  async loop({ page, step, context, handler, options }) {
    const { iterations, itemsPath, steps = [], breakOnError = true } = step;
    const items = itemsPath ? context.get(itemsPath, []) : null;
    const total = Array.isArray(items) ? items.length : Number(iterations ?? 0);
    const loopResults = [];

    for (let index = 0; index < total; index += 1) {
      context.setVariable('loop.index', index);
      context.setVariable('loop.number', index + 1);
      if (Array.isArray(items)) context.setVariable('loop.item', items[index]);

      const nestedResult = await handler.executeSteps(page, steps, {
        ...options,
        context,
        nested: true,
        throwOnError: false
      });

      loopResults.push({ index, success: nestedResult.success, results: nestedResult.results });

      if (!nestedResult.success && breakOnError) break;
    }

    return { action: 'loop', iterations: total, results: loopResults };
  },

  async runSteps({ page, step, context, handler, options }) {
    const nestedResult = await handler.executeSteps(page, step.steps ?? [], {
      ...options,
      context,
      nested: true
    });

    return { action: 'runSteps', nested: nestedResult.results };
  }
};
