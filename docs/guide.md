# Guia para construir pasos del SDK

Este manual explica como escribir archivos como `projects/example/steps/step_1.js`. Estos archivos no ejecutan Puppeteer directamente; solo declaran una secuencia de pasos. El SDK recibe ese array, abre una pagina con el `browser-manager`, ejecuta cada objeto con `action-handler` y devuelve resultados, datos guardados, logs y errores.

La carpeta de trabajo para tus automatizaciones es `projects/<nombre>/`. El core del SDK vive en `src/` y normalmente no se toca.

## Flujo mental

Un proyecto tiene dos tipos de archivo:

- `start.js`: orquesta la peticion POST, recibe `body` y llama `runSteps`.
- `steps/*.js`: exporta funciones que devuelven arrays de objetos.

Ejemplo minimo:

```text
projects/
  stellar/
    start.js
    steps/
      step_1.js
```

`projects/stellar/start.js`:

```js
import { firstSteps } from './steps/step_1.js';

export default async function start({ body, runSteps }) {
  const result = await runSteps(firstSteps({
    query: body.query ?? 'hola'
  }));

  return {
    status: result.success ? 200 : 422,
    body: {
      success: result.success,
      status: result.success ? 'OK' : 'FLOW_FAILED',
      message: result.success ? 'Flujo ejecutado' : 'El flujo fallo',
      data: result.context.data,
      sdk: result
    }
  };
}
```

`projects/stellar/steps/step_1.js`:

```js
export const firstSteps = ({ query = 'hola' } = {}) => [
  { type: 'consoleLog', message: `Buscando ${query}` },
  { type: 'goto', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
  { type: 'waitForSelector', selector: 'a h3', visible: true },
  { type: 'extractText', selector: 'a h3', saveAs: 'firstTitle' }
];
```

## Contrato de un paso

Cada paso es un objeto con `type`.

```js
{
  name: 'Nombre opcional para logs',
  type: 'click'
}
```

Opciones comunes a cualquier accion:

- `name`: nombre legible. Aparece en logs y resultados.
- `retries`: reintentos adicionales del paso.
- `retryDelay`: espera entre reintentos en milisegundos. Por defecto `500`.
- `timeoutMs`: timeout externo del paso completo.
- `critical`: si es `true`, un fallo lanza error y aborta.
- `continueOnError`: si es `true`, permite continuar aunque ese paso falle.
- `resultAs`: guarda el resultado completo del paso en el contexto.

Ejemplo:

```js
{
  name: 'Esperar resultados',
  type: 'waitForSelector',
  selector: '.result',
  visible: true,
  timeout: 15000,
  retries: 2,
  retryDelay: 1000,
  critical: true,
  resultAs: 'waitResult'
}
```

## Contexto, variables e interpolacion

El SDK mantiene un contexto durante toda la ejecucion:

- `context.data`: datos guardados con `saveAs`, `setData` o resultados.
- `context.variables`: variables enviadas desde `runSteps`.
- `context.results`: resumen de pasos ejecutados.
- `context.console`: logs del SDK y del navegador.
- `context.artifacts`: archivos generados, por ejemplo screenshots.

Puedes usar interpolacion con `${...}` en cualquier string del paso.

```js
[
  { type: 'setData', name: 'baseUrl', value: 'https://example.com' },
  { type: 'goto', url: '${baseUrl}/products' },
  { type: 'extractText', selector: 'h1', saveAs: 'title' },
  { type: 'consoleLog', message: 'Titulo: ${title}' }
]
```

Rutas utiles:

- `${title}` busca primero en variables y luego en data.
- `${data.products.0.title}` lee `context.data`.
- `${variables.user.email}` lee `context.variables`.
- `${vars.user.email}` alias de `variables`.
- `${lastResult.result.data}` lee el ultimo resultado registrado.
- `${env.MY_ENV_VAR}` lee variables de entorno.

Si el string completo es solo `${variables.user}`, conserva el objeto original. Si el token esta dentro de un texto, los objetos se convierten a JSON.

## Respuesta de `runSteps`

`runSteps` devuelve:

```js
{
  executionId: 'run_...',
  success: true,
  results: [],
  context: {
    data: {},
    variables: {},
    artifacts: [],
    console: [],
    resultsCount: 0
  }
}
```

Para devolver datos al POST, normalmente lees `result.context.data`.

```js
const title = result.context.data.firstTitle;
```

## Navegacion

### `goto`

Navega a una URL.

```js
{
  type: 'goto',
  url: 'https://example.com',
  waitUntil: 'networkidle2',
  timeout: 30000,
  referrer: 'https://google.com'
}
```

Parametros:

- `url`: requerido.
- `waitUntil`: evento de carga de Puppeteer. Comunes: `load`, `domcontentloaded`, `networkidle0`, `networkidle2`.
- `timeout`: timeout de navegacion.
- `referrer`: referrer opcional.

Guarda automaticamente:

- `lastUrl`
- `lastTitle`

### `goBack`

```js
{ type: 'goBack', waitUntil: 'networkidle2', timeout: 30000 }
```

### `goForward`

```js
{ type: 'goForward', waitUntil: 'networkidle2', timeout: 30000 }
```

### `reload`

```js
{ type: 'reload', waitUntil: 'networkidle2', timeout: 30000 }
```

## Esperas

Las esperas vuelven los flujos mas estables. Prefiere esperar selectores reales antes de extraer o hacer click.

### `wait`

Pausa fija.

```js
{ type: 'wait', duration: 1000 }
```

### `waitForSelector`

Espera un selector.

```js
{
  type: 'waitForSelector',
  selector: '.loaded',
  visible: true,
  timeout: 10000
}
```

Parametros:

- `selector`: requerido.
- `timeout`: milisegundos. Por defecto `10000`.
- `visible`: espera que sea visible.
- `hidden`: espera que desaparezca o quede oculto.

### `waitForNavigation`

```js
{ type: 'waitForNavigation', waitUntil: 'networkidle2', timeout: 30000 }
```

Usalo cuando un paso anterior dispara navegacion, aunque muchas veces conviene usar `click` con `waitForNavigation: true`.

### `waitForFunction`

Espera una expresion o funcion ejecutada en el navegador.

```js
{
  type: 'waitForFunction',
  fn: "() => window.appReady === true",
  timeout: 30000,
  polling: 'raf'
}
```

### `waitForNetworkIdle`

```js
{ type: 'waitForNetworkIdle', idleTime: 500, timeout: 30000 }
```

Si la version de Puppeteer no soporta `page.waitForNetworkIdle`, el SDK hace fallback a `wait`.

## Interaccion

### `click`

```js
{
  type: 'click',
  selector: 'button[type="submit"]',
  timeout: 5000,
  waitAfter: 250,
  waitForNavigation: false,
  waitUntil: 'networkidle2',
  navigationTimeout: 30000,
  button: 'left',
  clickCount: 1,
  delay: 0,
  useLocator: true
}
```

Parametros importantes:

- `selector`: requerido.
- `waitAfter`: pausa luego del click si no hay navegacion.
- `waitForNavigation`: usa `Promise.all` para click + navegacion.
- `useLocator`: intenta usar locator moderno de Puppeteer cuando aplica.

Ejemplo con navegacion:

```js
{
  type: 'click',
  selector: 'a.next-page',
  waitForNavigation: true,
  waitUntil: 'domcontentloaded'
}
```

### `type`

Escribe en un input o elemento editable.

```js
{
  type: 'type',
  selector: '#search',
  text: 'hola',
  clearFirst: true,
  delay: 0,
  timeout: 5000,
  useLocator: true
}
```

Parametros:

- `selector`: requerido.
- `text`: requerido.
- `clearFirst`: limpia antes de escribir.
- `delay`: demora entre teclas.

### `select`

Selecciona una opcion en un `<select>`.

```js
{ type: 'select', selector: '#country', value: 've' }
```

Tambien puedes seleccionar por texto visible:

```js
{ type: 'select', selector: '#country', text: 'Venezuela' }
```

### `hover`

```js
{ type: 'hover', selector: '.menu', timeout: 5000 }
```

### `scroll`

Scroll de ventana:

```js
{ type: 'scroll', amount: 600, direction: 'down', waitAfter: 250 }
```

Scroll hacia un elemento:

```js
{ type: 'scroll', selector: '.target', behavior: 'smooth' }
```

Parametros:

- `selector`: opcional. Si existe, hace `scrollIntoView`.
- `amount`: pixeles.
- `direction`: `down` o `up`.
- `waitAfter`: pausa posterior.
- `behavior`: `smooth` o `auto`.

### `press`

```js
{ type: 'press', key: 'Enter', delay: 0 }
```

Teclas comunes: `Enter`, `Tab`, `Escape`, `ArrowDown`.

### `uploadFile`

```js
{
  type: 'uploadFile',
  selector: 'input[type=file]',
  filePaths: ['C:/tmp/file.pdf'],
  timeout: 5000
}
```

## Extraccion

### `extractText`

Extrae texto o atributo de un selector.

```js
{
  type: 'extractText',
  selector: 'h1',
  attribute: 'textContent',
  saveAs: 'title',
  timeout: 5000,
  multiple: false
}
```

Parametros:

- `selector`: requerido.
- `attribute`: por defecto `textContent`. Tambien: `innerText`, `innerHTML`, `outerHTML`, o cualquier atributo HTML.
- `saveAs`: clave donde se guarda el valor.
- `multiple`: si es `true`, devuelve array de valores.

Ejemplos:

```js
{ type: 'extractText', selector: 'h1', saveAs: 'title' }
{ type: 'extractText', selector: 'a.result', attribute: 'href', saveAs: 'url' }
{ type: 'extractText', selector: '.tag', multiple: true, saveAs: 'tags' }
```

### `extractAttribute`

Extrae un atributo explicitamente.

```js
{
  type: 'extractAttribute',
  selector: 'a.result',
  attribute: 'href',
  saveAs: 'firstUrl',
  timeout: 5000
}
```

### `extractHTML`

```js
{
  type: 'extractHTML',
  selector: 'main',
  outer: true,
  saveAs: 'mainHTML',
  timeout: 5000
}
```

Si omites `selector`, extrae el HTML completo del documento.

### `extractList`

Extrae una lista de elementos con campos.

```js
{
  type: 'extractList',
  selector: '.product',
  fields: {
    title: '.title',
    price: '.price',
    url: 'a@href',
    text: 'text()',
    badge: { selector: '.badge', attr: 'textContent', fallback: null }
  },
  saveAs: 'products',
  timeout: 5000,
  allowEmpty: false
}
```

Formatos de campo:

- `.title`: busca selector interno y devuelve texto.
- `a@href`: busca selector interno y devuelve atributo.
- `@href`: atributo del elemento raiz.
- `text()`, `textContent`, `text`: texto del elemento raiz.
- `html()`, `innerHTML`: HTML interno.
- `outerHTML`: HTML externo.
- `{ selector, attr, fallback }`: formato explicito.
- `{ value: 'constante' }`: valor fijo.

Si `allowEmpty` es `true`, no falla cuando no aparece el selector antes de evaluar.

### `extractTable`

```js
{
  type: 'extractTable',
  selector: 'table',
  includeHeaders: true,
  saveAs: 'rows',
  timeout: 5000
}
```

Si hay headers, devuelve objetos. Si no, devuelve arrays por fila.

### `screenshot`

```js
{
  type: 'screenshot',
  path: 'artifacts/home.png',
  fullPage: true,
  saveAs: 'homeScreenshot',
  encoding: undefined,
  omitBackground: false
}
```

Parametros:

- `selector`: opcional. Si existe, captura solo ese elemento.
- `path`: ruta donde guardar.
- `fullPage`: captura pagina completa.
- `encoding`: por ejemplo `base64`.
- `saveAs`: guarda `{ path }` o el buffer/string resultante.

## Validacion

Las validaciones lanzan error si no se cumplen. Usa `continueOnError: true` si quieres seguir.

### `validateUrl`

```js
{ type: 'validateUrl', expectedContains: '/dashboard' }
```

Variantes:

```js
{ type: 'validateUrl', expectedExact: 'https://example.com/dashboard' }
{ type: 'validateUrl', expectedPattern: '/dashboard|/home' }
```

Parametros:

- `expectedContains`
- `expectedExact`
- `expectedPattern`
- `saveAs`

### `validateSelector`

```js
{
  type: 'validateSelector',
  selector: '.user-menu',
  shouldExist: true,
  visible: true,
  timeout: 5000,
  saveAs: 'userMenuCheck'
}
```

Para validar que no exista:

```js
{ type: 'validateSelector', selector: '.error', shouldExist: false }
```

### `validateText`

```js
{ type: 'validateText', selector: 'h1', containsText: 'Example' }
```

Variantes:

```js
{ type: 'validateText', selector: 'h1', expectedText: 'Example Domain' }
{ type: 'validateText', selector: 'h1', matchPattern: 'Example\\s+Domain' }
```

Parametros:

- `expectedText`
- `containsText`
- `matchPattern`
- `normalizeSpace`: por defecto `true`.
- `saveAs`

### `validateCondition`

Evalua una condicion en el navegador o contra el contexto.

```js
{
  type: 'validateCondition',
  condition: "document.querySelectorAll('a').length > 0",
  message: 'No hay links'
}
```

Con argumentos:

```js
{
  type: 'validateCondition',
  condition: "document.body.innerText.includes(args[0])",
  args: ['hola'],
  saveAs: 'containsHola'
}
```

### `validateData`

Valida datos guardados en el contexto.

```js
{ type: 'validateData', path: 'products', exists: true }
```

Checks disponibles:

- `exists`
- `equals`
- `notEquals`
- `includes`
- `minLength`
- `maxLength`
- `matches`
- `saveAs`

Ejemplo:

```js
{
  type: 'validateData',
  path: 'products',
  minLength: 1,
  saveAs: 'hasProducts'
}
```

## Datos y variables

### `setVariable`

Guarda en `context.variables`.

```js
{ type: 'setVariable', name: 'query', value: 'hola' }
```

Soporta rutas:

```js
{ type: 'setVariable', name: 'user.email', value: 'user@example.com' }
```

### `setData`

Guarda en `context.data`.

```js
{ type: 'setData', name: 'status', value: 'ok' }
```

## Logs

### `consoleLog` y `log`

Ambos hacen lo mismo. Sirven para dejar trazas dentro de `result.context.console` y en consola del servidor.

```js
{ type: 'consoleLog', level: 'info', message: 'Iniciando busqueda' }
```

Con interpolacion:

```js
{ type: 'consoleLog', level: 'info', message: 'Titulo capturado: ${firstTitle}' }
```

Con `args`:

```js
{
  type: 'log',
  level: 'warn',
  label: 'debug',
  args: ['Producto', '${productTitle}', '${lastResult}']
}
```

Niveles:

- `info`
- `debug`
- `warn`
- `error`

Ademas, el handler captura eventos `console` y `pageerror` emitidos por la pagina de Puppeteer, salvo que ejecutes con `options.captureConsole=false`.

## Control de flujo

### `conditional`

Ejecuta `then` o `else` segun una condicion.

```js
{
  type: 'conditional',
  condition: { selector: '.logged-in', exists: true },
  then: [
    { type: 'extractText', selector: '.user-name', saveAs: 'userName' }
  ],
  else: [
    { type: 'goto', url: 'https://example.com/login' }
  ]
}
```

Condiciones por selector:

```js
{ selector: '.modal', exists: true }
```

Condiciones por data:

```js
{ path: 'products', minLength: 1 }
```

Condiciones por expresion:

```js
{
  expression: "document.querySelectorAll('.item').length > 0"
}
```

### `loop`

Repite pasos por cantidad fija.

```js
{
  type: 'loop',
  iterations: 3,
  steps: [
    { type: 'scroll', amount: 500 },
    { type: 'wait', duration: 500 }
  ]
}
```

Durante el loop se crean variables:

- `${loop.index}`: indice desde `0`.
- `${loop.number}`: numero desde `1`.

### `loop` con `itemsPath`

Itera sobre un array guardado.

```js
{
  type: 'loop',
  itemsPath: 'products',
  steps: [
    { type: 'goto', url: '${loop.item.url}' },
    { type: 'extractText', selector: 'h1', saveAs: 'currentProductTitle' }
  ]
}
```

Variables disponibles:

- `${loop.item}`: item actual.
- `${loop.item.url}`: campo del item actual.
- `${loop.index}`
- `${loop.number}`

### `runSteps`

Ejecuta pasos anidados en el mismo contexto.

```js
{
  type: 'runSteps',
  steps: [
    { type: 'wait', duration: 250 },
    { type: 'consoleLog', message: 'Bloque anidado' }
  ]
}
```

## Patrones recomendados

### Scraping de una pagina simple

```js
export const scrapePage = ({ url }) => [
  { type: 'consoleLog', message: `Abriendo ${url}` },
  { type: 'goto', url, waitUntil: 'domcontentloaded' },
  { type: 'waitForSelector', selector: 'h1', visible: true },
  { type: 'extractText', selector: 'h1', saveAs: 'title' },
  { type: 'extractList', selector: 'a', fields: { text: 'text()', href: '@href' }, saveAs: 'links', allowEmpty: true }
];
```

### Busqueda con formulario

```js
export const searchSteps = ({ query }) => [
  { type: 'goto', url: 'https://example.com/search', waitUntil: 'domcontentloaded' },
  { type: 'type', selector: '#q', text: query },
  { type: 'click', selector: 'button[type="submit"]', waitForNavigation: true },
  { type: 'waitForSelector', selector: '.result', visible: true },
  {
    type: 'extractList',
    selector: '.result',
    fields: {
      title: '.title',
      url: 'a@href',
      summary: { selector: '.summary', fallback: null }
    },
    saveAs: 'results'
  }
];
```

### Manejo de elemento opcional

```js
export const closeOptionalModal = () => [
  {
    type: 'conditional',
    condition: { selector: '.modal .close', exists: true },
    then: [
      { type: 'click', selector: '.modal .close', waitAfter: 300 }
    ],
    else: [
      { type: 'consoleLog', level: 'debug', message: 'No habia modal' }
    ]
  }
];
```

### Extraccion paginada simple

```js
export const paginateSteps = ({ baseUrl, pages = 3 }) => [
  { type: 'goto', url: baseUrl },
  {
    type: 'loop',
    iterations: pages,
    steps: [
      {
        type: 'extractList',
        selector: '.item',
        fields: { title: '.title', url: 'a@href' },
        saveAs: 'currentPageItems',
        allowEmpty: true
      },
      { type: 'consoleLog', message: 'Pagina ${loop.number}: ${currentPageItems}' },
      {
        type: 'conditional',
        condition: { selector: 'a.next', exists: true },
        then: [
          { type: 'click', selector: 'a.next', waitForNavigation: true }
        ],
        else: [
          { type: 'consoleLog', message: 'No hay siguiente pagina' }
        ]
      }
    ]
  }
];
```

## Buenas practicas

- Usa `waitForSelector` antes de `extractText`, `extractList` o `click` cuando el contenido sea dinamico.
- Usa `waitUntil: 'domcontentloaded'` para paginas rapidas y `networkidle2` cuando necesitas esperar requests.
- Guarda datos con nombres claros: `firstResultTitle`, `products`, `profileName`.
- Usa `consoleLog` al inicio, antes de pasos delicados y despues de extracciones importantes.
- Marca como `critical: true` los pasos sin los cuales el flujo no tiene sentido.
- Usa `continueOnError: true` para datos opcionales, banners, modales o screenshots no criticos.
- Evita sleeps largos como primera opcion. Prefiere esperar selectores o funciones.
- No importes Puppeteer en `steps/*.js`; el SDK ya administra browser y page.
- No cierres paginas ni navegadores desde pasos. Eso es responsabilidad del `browser-manager`.
- Mantente dentro de `projects/<nombre>`. Cambia `src/lib/*` solo si vas a modificar el SDK.

## Errores comunes

### `Se requiere steps como array`

Tu funcion de pasos no esta devolviendo un array.

```js
export const bad = () => ({ type: 'goto', url: 'https://example.com' });
export const good = () => [{ type: 'goto', url: 'https://example.com' }];
```

### `El paso X requiere: selector`

La accion necesita un parametro obligatorio. Revisa `selector`, `url`, `text`, `fields`, etc.

### El selector existe en DevTools pero falla en el SDK

Prueba:

- aumentar `timeout`
- agregar `waitForSelector`
- usar `visible: true`
- esperar navegacion o network idle
- revisar si el contenido esta dentro de iframe o shadow DOM

### El dato guardado sale vacio en `${...}`

Revisa el orden de los pasos. La interpolacion ocurre justo antes de ejecutar cada paso; el dato debe haberse guardado antes.

## Ejemplo completo basado en `projects/example`

```js
export const googleSearchSteps = ({ query = 'hola' } = {}) => [
  {
    type: 'consoleLog',
    level: 'info',
    message: `Buscando "${query}" en Google`
  },
  {
    type: 'goto',
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=es&num=10`,
    waitUntil: 'domcontentloaded',
    timeout: 45000
  },
  {
    type: 'waitForSelector',
    selector: 'a h3',
    visible: true,
    timeout: 15000
  },
  {
    type: 'extractText',
    selector: 'a h3',
    saveAs: 'firstResultTitle',
    timeout: 15000
  },
  {
    type: 'consoleLog',
    level: 'info',
    message: 'Titulo capturado: ${firstResultTitle}'
  }
];
```

Prueba por POST:

```powershell
curl.exe -X POST "http://localhost:3000/projects" `
  -H "Content-Type: application/json" `
  -d "{\"project\":\"example\",\"query\":\"hola\"}"
```
