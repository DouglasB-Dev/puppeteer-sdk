export const createActionError = (message, metadata = {}) => {
  const error = new Error(message);
  error.name = 'ActionExecutionError';
  Object.assign(error, metadata);
  return error;
};

export const getErrorMessage = (error) => {
  if (!error) return 'Error desconocido';
  if (error instanceof Error) return error.message;
  return String(error);
};
