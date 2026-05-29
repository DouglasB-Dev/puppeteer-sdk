import { serializeForOutput } from '../utils/interpolate.js';

const stringify = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(serializeForOutput(value));
  return String(value);
};

const normalizeLevel = (level) => {
  const normalized = String(level ?? 'info').toLowerCase();
  return ['info', 'debug', 'warn', 'error'].includes(normalized) ? normalized : 'info';
};

const runConsoleLog = async ({ step, context, log }) => {
  const level = normalizeLevel(step.level);
  const args = Array.isArray(step.args)
    ? step.args
    : [step.message ?? step.value ?? step.data ?? ''];
  const label = step.label ? `${step.label}:` : null;
  const outputArgs = label ? [label, ...args] : args;
  const message = outputArgs.map(stringify).join(' ').trim();

  log[level]?.(...outputArgs);
  context.addConsole?.({
    source: 'action',
    level,
    message,
    args: serializeForOutput(args)
  });

  return {
    action: 'consoleLog',
    level,
    message,
    args: serializeForOutput(args)
  };
};

export const consoleActions = {
  consoleLog: runConsoleLog,
  log: runConsoleLog
};
