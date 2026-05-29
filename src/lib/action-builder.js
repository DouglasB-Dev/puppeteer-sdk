const cloneStep = (step) => ({ ...step });

const normalizeExpectedUrl = (expected, options = {}) => {
  if (expected instanceof RegExp) return { expectedPattern: expected.source };
  if (typeof expected === 'string') {
    if (options.exact === true) return { expectedExact: expected };
    if (options.pattern === true) return { expectedPattern: expected };
    return { expectedContains: expected };
  }
  if (expected && typeof expected === 'object') return expected;
  return {};
};

const normalizeExpectedText = (expected, options = {}) => {
  if (expected instanceof RegExp) return { matchPattern: expected.source };
  if (options.contains === true) return { containsText: expected };
  if (options.pattern === true) return { matchPattern: expected };
  return { expectedText: expected };
};

export const createActionBuilder = (initialSteps = []) => {
  const steps = [...initialSteps.map(cloneStep)];

  const add = (step) => {
    steps.push(step);
    return api;
  };

  const api = {
    add,

    goto(url, options = {}) {
      return add({ name: `Navegar a ${url}`, type: 'goto', url, ...options });
    },

    goBack(options = {}) {
      return add({ name: 'Volver atras', type: 'goBack', ...options });
    },

    goForward(options = {}) {
      return add({ name: 'Ir adelante', type: 'goForward', ...options });
    },

    reload(options = {}) {
      return add({ name: 'Recargar pagina', type: 'reload', ...options });
    },

    click(selector, options = {}) {
      return add({ name: `Click en ${selector}`, type: 'click', selector, ...options });
    },

    type(selector, text, options = {}) {
      return add({ name: `Escribir en ${selector}`, type: 'type', selector, text, ...options });
    },

    select(selector, value, options = {}) {
      return add({ name: `Seleccionar en ${selector}`, type: 'select', selector, value, ...options });
    },

    hover(selector, options = {}) {
      return add({ name: `Hover en ${selector}`, type: 'hover', selector, ...options });
    },

    scroll(options = {}) {
      return add({ name: 'Scroll', type: 'scroll', ...options });
    },

    press(key, options = {}) {
      return add({ name: `Presionar ${key}`, type: 'press', key, ...options });
    },

    uploadFile(selector, filePaths, options = {}) {
      return add({ name: `Subir archivo en ${selector}`, type: 'uploadFile', selector, filePaths, ...options });
    },

    extractText(selector, saveAs, options = {}) {
      return add({ name: `Extraer texto de ${selector}`, type: 'extractText', selector, saveAs, ...options });
    },

    extractList(selector, fields, saveAs, options = {}) {
      return add({ name: `Extraer lista de ${selector}`, type: 'extractList', selector, fields, saveAs, ...options });
    },

    extractHTML(selector, saveAs, options = {}) {
      return add({ name: `Extraer HTML de ${selector ?? 'documento'}`, type: 'extractHTML', selector, saveAs, ...options });
    },

    extractAttribute(selector, attribute, saveAs, options = {}) {
      return add({ name: `Extraer atributo ${attribute} de ${selector}`, type: 'extractAttribute', selector, attribute, saveAs, ...options });
    },

    extractTable(selector, saveAs, options = {}) {
      return add({ name: `Extraer tabla ${selector}`, type: 'extractTable', selector, saveAs, ...options });
    },

    screenshot(options = {}) {
      return add({ name: 'Tomar screenshot', type: 'screenshot', ...options });
    },

    validateUrl(expected, options = {}) {
      const params = normalizeExpectedUrl(expected, options);
      const { exact, pattern, ...rest } = options;
      return add({ name: 'Validar URL', type: 'validateUrl', ...params, ...rest });
    },

    validateSelector(selector, shouldExist = true, options = {}) {
      return add({ name: `Validar selector ${selector}`, type: 'validateSelector', selector, shouldExist, ...options });
    },

    validateText(selector, expected, options = {}) {
      const params = normalizeExpectedText(expected, options);
      const { contains, pattern, ...rest } = options;
      return add({ name: `Validar texto en ${selector}`, type: 'validateText', selector, ...params, ...rest });
    },

    validateCondition(condition, options = {}) {
      return add({ name: 'Validar condicion', type: 'validateCondition', condition, ...options });
    },

    validateData(path, options = {}) {
      return add({ name: `Validar data ${path}`, type: 'validateData', path, ...options });
    },

    wait(duration, options = {}) {
      return add({ name: `Esperar ${duration}ms`, type: 'wait', duration, ...options });
    },

    waitForSelector(selector, options = {}) {
      return add({ name: `Esperar selector ${selector}`, type: 'waitForSelector', selector, ...options });
    },

    waitForNavigation(options = {}) {
      return add({ name: 'Esperar navegacion', type: 'waitForNavigation', ...options });
    },

    waitForFunction(fn, options = {}) {
      return add({ name: 'Esperar funcion', type: 'waitForFunction', fn, ...options });
    },

    setVariable(name, value, options = {}) {
      return add({ name: `Set variable ${name}`, type: 'setVariable', name, value, ...options });
    },

    setData(name, value, options = {}) {
      return add({ name: `Set data ${name}`, type: 'setData', name, value, ...options });
    },

    custom(name, type, params = {}, options = {}) {
      return add({ name, type, ...params, ...options });
    },

    if(condition, thenSteps, elseSteps = [], options = {}) {
      return add({
        name: options.name ?? 'Condicional',
        type: 'conditional',
        condition,
        then: typeof thenSteps?.build === 'function' ? thenSteps.build() : thenSteps,
        else: typeof elseSteps?.build === 'function' ? elseSteps.build() : elseSteps,
        ...options
      });
    },

    when(condition, thenSteps, elseSteps = [], options = {}) {
      return api.if(condition, thenSteps, elseSteps, options);
    },

    loop(iterations, nestedSteps, options = {}) {
      return add({
        name: options.name ?? `Loop ${iterations} veces`,
        type: 'loop',
        iterations,
        steps: typeof nestedSteps?.build === 'function' ? nestedSteps.build() : nestedSteps,
        ...options
      });
    },

    forEach(itemsPath, nestedSteps, options = {}) {
      return add({
        name: options.name ?? `Loop por ${itemsPath}`,
        type: 'loop',
        itemsPath,
        steps: typeof nestedSteps?.build === 'function' ? nestedSteps.build() : nestedSteps,
        ...options
      });
    },

    build() {
      return steps.map(cloneStep);
    },

    reset() {
      steps.length = 0;
      return api;
    }
  };

  return api;
};
