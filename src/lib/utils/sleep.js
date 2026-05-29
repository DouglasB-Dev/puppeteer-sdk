export const sleep = (duration = 0) => new Promise((resolve) => setTimeout(resolve, duration));

export const withTimeout = async (promise, timeoutMs, label = 'operacion') => {
  if (!timeoutMs) return promise;

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout de ${timeoutMs}ms excedido en ${label}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};
