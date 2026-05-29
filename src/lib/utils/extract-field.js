export const normalizeFields = (fields) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('extractList requiere fields como objeto');
  }
  return fields;
};
