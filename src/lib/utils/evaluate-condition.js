import { getByPath } from './interpolate.js';

const compareValue = (actual, condition) => {
  if ('exists' in condition) return condition.exists ? actual !== undefined && actual !== null : actual === undefined || actual === null;
  if ('equals' in condition) return actual === condition.equals;
  if ('notEquals' in condition) return actual !== condition.notEquals;
  if ('includes' in condition) return Array.isArray(actual) || typeof actual === 'string' ? actual.includes(condition.includes) : false;
  if ('minLength' in condition) return actual?.length >= condition.minLength;
  if ('maxLength' in condition) return actual?.length <= condition.maxLength;
  if ('matches' in condition) return new RegExp(condition.matches).test(String(actual ?? ''));
  return Boolean(actual);
};

const evaluateSelectorCondition = async (page, condition) => {
  const selector = condition.selector;
  const exists = (await page.$(selector)) !== null;

  if ('exists' in condition) return condition.exists ? exists : !exists;
  return exists;
};

const evaluateBrowserExpression = async (page, expression, args = []) => {
  if (typeof expression === 'function') return page.evaluate(expression, ...args);

  return page.evaluate(
    (source, browserArgs) => {
      const fn = new Function('args', `return (${source});`);
      return fn(browserArgs);
    },
    expression,
    args
  );
};

export const evaluateCondition = async ({ page, context, condition, args = [] }) => {
  if (typeof condition === 'boolean') return condition;
  if (typeof condition === 'function' || typeof condition === 'string') {
    return Boolean(await evaluateBrowserExpression(page, condition, args));
  }

  if (!condition || typeof condition !== 'object') return Boolean(condition);

  if (condition.selector) return evaluateSelectorCondition(page, condition);

  if (condition.expression || condition.fn) {
    return Boolean(await evaluateBrowserExpression(page, condition.expression ?? condition.fn, condition.args ?? args));
  }

  if (condition.path) {
    const source = String(condition.path).startsWith('variables.')
      ? context.variables
      : String(condition.path).startsWith('data.')
        ? context.data
        : null;
    const normalizedPath = String(condition.path).replace(/^variables\./, '').replace(/^data\./, '');
    const actual = source ? getByPath(source, normalizedPath) : context.get(condition.path);
    return compareValue(actual, condition);
  }

  return compareValue(condition.value, condition);
};

export const assertCondition = async ({ page, context, condition, args = [], message = 'La condicion no se cumplio' }) => {
  const ok = await evaluateCondition({ page, context, condition, args });
  if (!ok) throw new Error(message);
  return ok;
};
