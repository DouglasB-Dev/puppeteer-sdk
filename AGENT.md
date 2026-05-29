# AGENT.md

Reglas operativas para cualquier persona o IA que trabaje en este SDK.

## Mandatorios

- Antes de cambiar codigo, leer `README.md`, `docs/actions.md`, este archivo y `changelog.md`.
- Cada cambio funcional, estructural o de contrato debe actualizar `README.md`, `docs/actions.md` y `changelog.md` en el mismo turno.
- `changelog.md` debe explicar que cambio se hizo, para que se hizo y que archivos o areas quedan afectadas.
- Usar `pnpm` como gestor principal. Los comandos esperados son `pnpm run start`, `pnpm run dev`, `pnpm run check` y `pnpm test`.
- No lanzar Puppeteer directamente desde proyectos o rutas. Todo navegador/pagina debe pasar por `src/lib/browser-manager.js`.
- Este SDK usa Google Chrome. No cambiar a Chromium ni depender del binario descargado por defecto sin aprobacion explicita.
- No mezclar logica especifica de proyectos dentro del core del SDK. Los proyectos viven en `projects/<nombre>`.
- Validar siempre rutas de proyectos contra path traversal. Un `project` recibido por POST nunca debe poder salir de `/projects`.
- Mantener respuestas HTTP con `success`, `status` y `message` cuando se agreguen flujos nuevos.
- Ejecutar verificaciones relevantes antes de cerrar un cambio. Como minimo: `pnpm run check` y `pnpm test` cuando las dependencias esten instaladas.

## Arquitectura

- `src/server.js`: arranque del servicio Express y cierre ordenado del browser manager.
- `src/app.js`: middleware, healthcheck y montaje de routers. Debe apuntar a `projects/redirect.js` para ejecutar proyectos por POST.
- `src/routes/scraper-routes.js`: API generica del SDK para ejecutar arrays de acciones y flujos predefinidos.
- `src/lib/browser-manager.js`: unico responsable de iniciar Google Chrome, crear paginas, limpiar pestanas y decidir si el navegador queda abierto o se cierra por peticion.
- `src/lib/action-handler.js`: ejecuta arrays de objetos, aplica interpolacion, reintentos, hooks, resultados y captura de logs de consola.
- `src/lib/actions/*`: catalogo de acciones atomicas. Toda accion nueva debe documentarse en `docs/actions.md`.
- `projects/redirect.js`: router/loader de proyectos. Recibe `body.project`, resuelve `projects/<project>/start.js` por defecto y entrega helpers como `runSteps`.
- `projects/<project>/start.js`: orquestador del proyecto. Puede importar pasos desde `projects/<project>/steps/*.js` y pasar variables recibidas por POST.
- `projects/<project>/steps/*.js`: archivos que devuelven bloques de arrays con objetos de acciones.
- `pm2/ecosystem.config.cjs`: configuracion de produccion para PM2.
- `install/ubuntu.sh` y `install/windows.ps1`: instaladores operativos del servicio.

## Browser Manager

El manager debe soportar estas politicas por variables de entorno:

- `PUPPETEER_BROWSER_MODE=keep-open`: mantiene Chrome abierto y, al terminar una peticion, limpia pestanas dejando una sola en `about:blank`.
- `PUPPETEER_BROWSER_MODE=close-after-request`: cierra Chrome al terminar cada peticion.
- `PUPPETEER_PERSIST_SESSION=true`: mantiene datos, cookies y perfil en `PUPPETEER_USER_DATA_DIR`.
- `PUPPETEER_PERSIST_SESSION=false`: usa contextos aislados por peticion y no guarda cookies/datos entre ejecuciones.
- `PUPPETEER_BROWSER_CHANNEL=chrome`: canal por defecto. `PUPPETEER_EXECUTABLE_PATH` solo se usa cuando se requiere una ruta explicita.

`pnpm run start` debe ejecutar el servicio en headless. `pnpm run dev` debe abrir la ventana de Chrome para depuracion.

## Contrato De Proyectos

Entrada HTTP minima:

```json
{
  "project": "example"
}
```

Tambien se acepta `"/example"` y se normaliza dentro de `/projects`. Por defecto se carga `start.js`; si se envia `entry`, debe seguir estando dentro del directorio del proyecto.

`start.js` debe exportar una funcion `default` o `start`:

```js
export default async function start({ body, runSteps }) {
  const result = await runSteps([{ type: 'goto', url: 'https://example.com' }]);
  return { status: 200, body: { success: true, status: 'OK', message: 'Listo', sdk: result } };
}
```

Los proyectos pueden responder su propio `status` y `body`. Si el error ocurre en el redirect, carga del proyecto o contrato del SDK, la respuesta debe usar status propios del SDK como `SDK_PROJECT_REQUIRED`, `SDK_PROJECT_ENTRY_NOT_FOUND` o `SDK_INVALID_STEPS`.

## Logs

Los bloques de acciones pueden emitir logs con `consoleLog` o `log`. El handler tambien captura eventos `console` y `pageerror` de Puppeteer en `result.context.console`.

## Documentacion

Cuando se agregue o cambie una accion:

- Actualizar `docs/actions.md` con parametros, ejemplo y comportamiento.
- Actualizar `README.md` si cambia un flujo visible, comando, ruta o configuracion.
- Agregar una entrada en `changelog.md` con fecha, objetivo y archivos principales.
