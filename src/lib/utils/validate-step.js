const requiredParams = {
  goto: ['url'],
  click: ['selector'],
  type: ['selector', 'text'],
  select: ['selector'],
  hover: ['selector'],
  press: ['key'],
  uploadFile: ['selector', 'filePaths'],
  extractText: ['selector'],
  extractList: ['selector', 'fields'],
  extractAttribute: ['selector', 'attribute'],
  extractTable: ['selector'],
  validateSelector: ['selector'],
  validateText: ['selector'],
  waitForSelector: ['selector'],
  setVariable: ['name'],
  setData: ['name']
};

export const validateStep = (step, index = 0) => {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    throw new Error(`El paso ${index + 1} debe ser un objeto`);
  }

  if (!step.type || typeof step.type !== 'string') {
    throw new Error(`El paso ${index + 1} requiere un campo string \"type\"`);
  }

  const required = requiredParams[step.type] ?? [];
  const missing = required.filter((param) => step[param] === undefined || step[param] === null);

  if (missing.length > 0) {
    throw new Error(`El paso ${index + 1} (${step.type}) requiere: ${missing.join(', ')}`);
  }

  return true;
};
