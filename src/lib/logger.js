export const createLogger = ({ verbose = true, prefix = '[scraper]' } = {}) => {
  const enabled = Boolean(verbose);

  const format = (level, args) => [prefix, level, ...args];

  return {
    info: (...args) => {
      if (enabled) console.log(...format('info', args));
    },
    debug: (...args) => {
      if (enabled) console.log(...format('debug', args));
    },
    warn: (...args) => {
      if (enabled) console.warn(...format('warn', args));
    },
    error: (...args) => console.error(...format('error', args))
  };
};
