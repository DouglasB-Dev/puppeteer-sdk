# Puppeteer SDK

SDK funcional para ejecutar automatizaciones de Puppeteer con Google Chrome desde arrays de acciones JSON/JS o desde proyectos en `/projects`. La base es una libreria de acciones + un manejador que las ejecuta paso a paso. Incluye validacion basica, interpolacion de variables, condicionales, loops, reintentos, hooks, registro de acciones personalizadas, rutas HTTP, runner de proyectos, PM2 e instaladores.

## Sobre `class` en JavaScript

`class` sigue siendo JavaScript valido y moderno. No esta obsoleto. Aun asi, este proyecto usa modulos ESM, funciones y factories porque encajan mejor con una libreria de acciones: son mas simples de testear, registrar, reemplazar y componer.

## Instalacion

```bash
pnpm install
cp .env.example .env
pnpm run example:array
pnpm run start
```

Servidor por defecto:

```text
GET  /health
GET  /api/scraper/actions
POST /api/scraper/execute
POST /api/scraper/flows/login
POST /api/scraper/flows/offers
POST /api/scraper/flows/validate-page
POST /projects
POST /api/projects
```

`pnpm run start` inicia el servicio en modo headless. `pnpm run dev` abre Google Chrome con ventana visible para depurar. `pnpm run dev:watch` queda disponible, pero en sesiones persistentes conviene usar `dev` para evitar reinicios del proceso mientras Chrome conserva el perfil.

## Prueba rapida de `/example`

1. Inicia el servicio con ventana visible:

```bash
pnpm run dev
```

2. Envia la peticion POST al proyecto de ejemplo:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/projects" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"project":"example","query":"hola"}'
```

Alternativa con `curl.exe` en Windows:

```powershell
curl.exe -X POST "http://localhost:3000/projects" `
  -H "Content-Type: application/json" `
  -d "{\"project\":\"example\",\"query\":\"hola\"}"
```

El ejemplo carga `projects/example/start.js`, ejecuta los pasos de `projects/example/steps/step_1.js`, busca `hola` en Google y devuelve el titulo del primer resultado en `data.firstResultTitle`.

## Google Chrome y browser manager

No se usa Chromium como objetivo del SDK. El manager lanza Google Chrome con `PUPPETEER_BROWSER_CHANNEL=chrome` o con `PUPPETEER_EXECUTABLE_PATH` si necesitas apuntar a un binario especifico.

`pnpm-workspace.yaml` marca `puppeteer` con `allowBuilds: false` para evitar builds/postinstall que descarguen navegadores. Chrome debe estar instalado en el sistema por los instaladores o por el operador.

Variables principales:

```env
PROJECTS_ROOT=projects
PUPPETEER_HEADLESS=true
PUPPETEER_BROWSER_CHANNEL=chrome
PUPPETEER_EXECUTABLE_PATH=
PUPPETEER_BROWSER_MODE=keep-open
PUPPETEER_PERSIST_SESSION=false
PUPPETEER_USER_DATA_DIR=storage/chrome-profile
PUPPETEER_REMOTE_DEBUGGING_PORT=9222
```

- `PUPPETEER_BROWSER_MODE=keep-open`: deja Chrome abierto y limpia pestanas al terminar cada peticion, dejando una sola en `about:blank`.
- `PUPPETEER_BROWSER_MODE=close-after-request`: cierra Chrome al terminar cada peticion.
- `PUPPETEER_PERSIST_SESSION=true`: mantiene cookies/datos usando `PUPPETEER_USER_DATA_DIR`.
- `PUPPETEER_PERSIST_SESSION=false`: usa contextos aislados por peticion para no conservar sesion.
- `PUPPETEER_REMOTE_DEBUGGING_PORT`: puerto usado para reconectar al Chrome ya abierto en `keep-open` si el proceso Node se reinicia.

En `keep-open`, el manager usa una sola promesa de lanzamiento para evitar que dos peticiones abran Chrome al mismo tiempo. Si quedan varias peticiones activas, la limpieza de pestanas se ejecuta cuando termina la ultima, para no cerrar una pagina que aun esta trabajando.

## Estructura de carpetas

```text
.
  AGENT.md                  Reglas de trabajo para humanos e IAs.
  README.md                 Guia principal de uso y arquitectura.
  changelog.md              Historial obligatorio de cambios.
  package.json              Scripts y dependencias.
  pnpm-workspace.yaml       Politica de builds de pnpm.
  docs/
    actions.md              Catalogo de acciones y contratos.
  examples/
    api-request.json        Body de ejemplo para /api/scraper/execute.
    execute-array.js        Ejecucion directa de un array de acciones.
  install/
    ubuntu.sh               Instalador para Ubuntu.
    windows.ps1             Instalador para Windows.
  pm2/
    ecosystem.config.cjs    Configuracion de servicio PM2.
  projects/
    redirect.js             Router que carga proyectos por POST.
    example/
      start.js              Orquestador del proyecto example.
      steps/
        step_1.js           Bloque de acciones del ejemplo.
  scripts/
    run-server.js           Arranque headless o con ventana.
  src/
    app.js                  Express app y montaje de rutas.
    server.js               Inicio y cierre del servicio.
    config/env.js           Variables de entorno normalizadas.
    routes/                 Rutas HTTP del SDK.
    flows/                  Flujos predefinidos del SDK.
    lib/                    Nucleo de browser, acciones, contexto y handler.
  test/                     Tests unitarios.
```

## Como trabajar con el SDK

La carpeta de trabajo para automatizaciones es `projects/`. Crea un directorio por proyecto, por ejemplo `projects/stellar`, con un `start.js` y archivos de pasos dentro de `steps/`.

```text
projects/
  stellar/
    start.js
    steps/
      step_1.js
      step_2.js
```

`start.js` recibe el `body` del POST y usa `runSteps` para enviar arrays de acciones al manejador:

```js
import { firstStep } from './steps/step_1.js';

export default async function start({ body, runSteps }) {
  const result = await runSteps(firstStep({ value: body.value }));

  return {
    status: result.success ? 200 : 422,
    body: {
      success: result.success,
      status: result.success ? 'OK' : 'FLOW_FAILED',
      message: 'Proyecto ejecutado',
      sdk: result
    }
  };
}
```

Antes de cerrar cualquier cambio ejecuta:

```bash
pnpm run check
pnpm test
```

Cada cambio funcional debe actualizar `README.md`, `docs/actions.md` y `changelog.md`.

Para construir archivos como `projects/example/steps/step_1.js`, usa el manual completo en `docs/guide.md`. Ahi estan documentadas las acciones `goto`, `waitForSelector`, `consoleLog`, `extractText`, interacciones, validaciones, loops, condicionales, screenshots, extraccion de listas y patrones recomendados para scraping.

## Archivos sensibles

Trabaja normalmente dentro de `projects/<tu-proyecto>`. No modifiques estos archivos salvo que estes cambiando el SDK y entiendas el impacto:

- `src/lib/browser-manager.js`: ciclo de vida de Google Chrome, persistencia, limpieza de pestanas y reconexion.
- `src/lib/action-handler.js`: ejecucion de acciones, reintentos, errores, hooks y captura de consola.
- `src/lib/context.js`: almacenamiento de datos, variables, resultados y artefactos.
- `src/lib/actions/*`: acciones disponibles para todos los proyectos.
- `projects/redirect.js`: contrato HTTP de `/projects`, validacion de rutas y carga de `start.js`.
- `src/app.js` y `src/server.js`: montaje de rutas, middlewares y cierre ordenado.
- `src/config/env.js`: configuracion compartida por todo el servicio.
- `pnpm-workspace.yaml`: evita descargas/builds de navegadores porque el SDK usa Google Chrome del sistema.

## Ejecucion directa con array de acciones

```js
import { createActionHandler } from './src/lib/action-handler.js';
import { createBrowserManager } from './src/lib/browser-manager.js';

const steps = [
  { type: 'goto', url: 'https://example.com' },
  { type: 'extractText', selector: 'h1', saveAs: 'title' },
  { type: 'validateText', selector: 'h1', containsText: 'Example' }
];

const browserManager = createBrowserManager();
const page = await browserManager.newPage();

try {
  const result = await createActionHandler().executeSteps(page, steps, {
    verbose: true,
    variables: { runId: 'demo-1' }
  });

  console.log(result.context.data.title);
} finally {
  await page.close();
  await browserManager.close();
}
```

## Ejecucion por API

```bash
curl -X POST http://localhost:3000/api/scraper/execute \
  -H "Content-Type: application/json" \
  -d @examples/api-request.json
```

## Ejecucion por proyectos

La app monta `projects/redirect.js` en `POST /projects` y `POST /api/projects`. El body debe incluir `project` con el nombre de una carpeta dentro de `/projects`; por defecto se ejecuta `start.js`.

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"example\",\"query\":\"hola\"}"
```

Estructura esperada:

```text
projects/
  redirect.js
  example/
    start.js
    steps/
      step_1.js
```

`start.js` recibe las claves del POST por `body`, puede importar pasos desde `steps/*.js` y ejecutarlos con `runSteps`.
Si el proyecto no devuelve un codigo HTTP numerico valido, el redirect usa `200` cuando `success` no es `false` y `422` cuando `success` es `false`.

```js
export default async function start({ body, runSteps }) {
  const result = await runSteps([
    { type: 'goto', url: 'https://example.com' },
    { type: 'extractText', selector: 'h1', saveAs: 'title' }
  ]);

  return {
    status: result.success ? 200 : 422,
    body: {
      success: result.success,
      status: result.success ? 'OK' : 'FLOW_FAILED',
      message: 'Proyecto ejecutado',
      sdk: result
    }
  };
}
```

El proyecto `projects/example` demuestra una busqueda de `hola` en Google y extrae el titulo del primer enlace encontrado.

## Interpolacion

Cualquier string puede usar `${...}` para leer variables o datos guardados en el contexto.

```js
[
  { "type": "setVariable", "name": "baseUrl", "value": "https://example.com" },
  { "type": "goto", "url": "${baseUrl}" },
  { "type": "extractText", "selector": "h1", "saveAs": "pageTitle" },
  { "type": "setVariable", "name": "message", "value": "Titulo: ${pageTitle}" }
]
```

Rutas soportadas:

- `${baseUrl}` busca primero en `context.variables` y luego en `context.data`.
- `${data.products.0.title}` lee datos guardados.
- `${variables.user.email}` lee variables.
- `${lastResult.data}` lee el ultimo resultado.
- `${env.MY_ENV_VAR}` lee variables de entorno.

## Acciones principales

- Navegacion: `goto`, `goBack`, `goForward`, `reload`
- Interaccion: `click`, `type`, `select`, `hover`, `scroll`, `press`, `uploadFile`
- Extraccion: `extractText`, `extractList`, `extractHTML`, `extractAttribute`, `extractTable`, `screenshot`
- Validacion: `validateUrl`, `validateSelector`, `validateText`, `validateCondition`, `validateData`
- Espera: `wait`, `waitForSelector`, `waitForNavigation`, `waitForFunction`, `waitForNetworkIdle`
- Control: `conditional`, `loop`, `runSteps`
- Contexto: `setVariable`, `setData`
- Logs: `consoleLog`, `log`

Los eventos `console` y `pageerror` del navegador se capturan en `result.context.console`. Tambien puedes emitir logs desde un bloque:

```js
[
  { type: 'consoleLog', level: 'info', message: 'Titulo: ${pageTitle}' }
]
```

## Ejemplo con condicional y loop

```js
const steps = [
  { type: 'goto', url: 'https://example.com' },
  {
    type: 'conditional',
    condition: { selector: 'h1', exists: true },
    then: [
      { type: 'extractText', selector: 'h1', saveAs: 'title' }
    ],
    else: [
      { type: 'setData', name: 'title', value: null }
    ]
  },
  {
    type: 'loop',
    iterations: 3,
    steps: [
      { type: 'wait', duration: 250 },
      { type: 'scroll', amount: 350 }
    ]
  }
];
```

## Registro de acciones personalizadas

```js
const handler = createActionHandler();

handler.registerAction('saveOffer', async ({ step, context }) => {
  const offers = context.get('offers', []);
  console.log('Guardando ofertas', offers.length);
  return { count: offers.length };
});
```

## PM2

El archivo `pm2/ecosystem.config.cjs` levanta el servicio en produccion:

```bash
pm2 start pm2/ecosystem.config.cjs
pm2 save
```

## Instaladores

Scripts incluidos:

```bash
pnpm run install-ubuntu
```

```powershell
pnpm run install-windows
```

Ambos instalan Node.js 20+, Google Chrome, `pnpm`, `pm2`, dependencias del proyecto y ejecutan verificaciones. Los instaladores exportan `PUPPETEER_SKIP_DOWNLOAD=true` antes de `pnpm install`.

## Builder funcional

```js
import { createActionBuilder } from './src/lib/action-builder.js';

const steps = createActionBuilder()
  .goto('https://example.com')
  .extractText('h1', 'title')
  .validateText('h1', 'Example Domain', { contains: true })
  .build();
```

## Nota de scraping responsable

Antes de automatizar un sitio real, revisa terminos de uso, robots.txt, limites de carga y permisos. Usa delays razonables, identifica tu trafico si corresponde y evita recolectar datos sensibles sin autorizacion.
