import { createContext } from './context.js';
import { createActionRegistry } from './registry.js';
import { validateStep } from './utils/validate-step.js';
import { interpolateValue, serializeForOutput } from './utils/interpolate.js';
import { sleep, withTimeout } from './utils/sleep.js';
import { createLogger } from './logger.js';
import { createActionError, getErrorMessage } from './errors.js';

const now = () => new Date().toISOString();

const createSuccessRecord = ({ index, name, step, attempt, startedAt, result }) => ({
  step: index + 1,
  name,
  type: step.type,
  success: true,
  attempt: attempt + 1,
  durationMs: Date.now() - startedAt,
  timestamp: now(),
  result: serializeForOutput(result)
});

const createFailureRecord = ({ index, name, step, attempt, startedAt, error }) => ({
  step: index + 1,
  name,
  type: step.type,
  success: false,
  attempt: attempt + 1,
  durationMs: Date.now() - startedAt,
  timestamp: now(),
  error: getErrorMessage(error)
});

const attachPageConsole = (page, context, options = {}) => {
  if (!page || typeof page.on !== 'function' || options.captureConsole === false || options.nested) {
    return () => {};
  }

  const onConsole = (message) => {
    context.addConsole?.({
      source: 'page',
      level: typeof message.type === 'function' ? message.type() : 'log',
      message: typeof message.text === 'function' ? message.text() : String(message),
      location: typeof message.location === 'function' ? message.location() : null
    });
  };

  const onPageError = (error) => {
    context.addConsole?.({
      source: 'pageerror',
      level: 'error',
      message: getErrorMessage(error)
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return () => {
    if (typeof page.off === 'function') {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      return;
    }
    page.removeListener?.('console', onConsole);
    page.removeListener?.('pageerror', onPageError);
  };
};

const shouldStopAfterFailure = (step, options) => {
  if (step.continueOnError === true) return false;
  if (step.critical === true) return true;
  return options.continueOnError !== true;
};

export const createActionHandler = ({ actions = {}, hooks = {}, logger } = {}) => {
  const registry = createActionRegistry(actions);

  const api = {
    registerAction(name, action) {
      return registry.register(name, action);
    },

    listActions() {
      return registry.list();
    },

    async executeStep(page, rawStep, context, options = {}, index = 0, total = 1) {
      validateStep(rawStep, index);

      const step = interpolateValue(rawStep, context);
      const action = registry.get(step.type);
      if (!action) throw createActionError(`Accion no encontrada: ${step.type}`, { step, index });

      const log = logger ?? createLogger({ verbose: options.verbose !== false });
      const name = step.name ?? step.type;
      const retries = Number(step.retries ?? options.retries ?? 0);
      const retryDelay = Number(step.retryDelay ?? options.retryDelay ?? 500);
      const startedAt = Date.now();

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          if (options.verbose !== false && !options.nested) log.info(`[${index + 1}/${total}] ${name}`);
          await hooks.beforeStep?.({ page, step, rawStep, context, index, attempt });

          const actionPromise = action({ page, step, rawStep, context, handler: api, options, log, index, attempt });
          const result = await withTimeout(actionPromise, step.timeoutMs ?? options.timeoutMs, `${step.type}`);

          if (step.resultAs) context.set(step.resultAs, result);

          const record = createSuccessRecord({ index, name, step, attempt, startedAt, result });
          context.addResult(record);
          await hooks.afterStep?.({ page, step, rawStep, context, index, result, record });
          return record;
        } catch (error) {
          await hooks.onStepError?.({ page, step, rawStep, context, index, attempt, error });

          if (attempt < retries) {
            if (options.verbose !== false) log.warn(`Reintentando ${name}: ${getErrorMessage(error)}`);
            await sleep(retryDelay);
            continue;
          }

          const failure = createFailureRecord({ index, name, step, attempt, startedAt, error });
          context.addResult(failure);
          return failure;
        }
      }

      throw createActionError(`No se pudo ejecutar el paso ${name}`, { step, index });
    },

    async executeSteps(page, steps, options = {}) {
      if (!Array.isArray(steps)) throw new Error('executeSteps requiere un array de steps');

      const context = options.context ?? createContext({
        page,
        variables: options.variables ?? {},
        data: options.data ?? {},
        meta: options.meta ?? {}
      });
      context.page = page;

      const results = [];
      const executionId = options.executionId ?? `run_${Date.now()}`;
      const detachConsole = attachPageConsole(page, context, options);

      try {
        for (let index = 0; index < steps.length; index += 1) {
          const rawStep = steps[index];
          const record = await api.executeStep(page, rawStep, context, options, index, steps.length);
          results.push(record);

          if (!record.success && shouldStopAfterFailure(rawStep, options)) {
            if (options.throwOnError || rawStep.critical) {
              throw createActionError(`Paso fallido: ${record.name}. ${record.error}`, {
                step: rawStep,
                index,
                results
              });
            }
            break;
          }
        }

        return {
          executionId,
          success: results.every((result) => result.success),
          results,
          context: context.toJSON()
        };
      } finally {
        detachConsole();
      }
    }
  };

  return api;
};
