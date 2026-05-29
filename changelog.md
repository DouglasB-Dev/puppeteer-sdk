# Changelog

## 2026-05-29

- Se actualizo `AGENT.md` para definir que `docs/actions.md` y `docs/guide.md` solo deben modificarse cuando cambie la libreria usable del SDK para construir pasos/flujos; estructura, instalacion y operacion general pertenecen a `README.md`.
- Se reemplazo por completo `docs/guide.md` con un manual de uso para construir archivos `projects/<project>/steps/*.js`, incluyendo contrato de pasos, interpolacion, `goto`, esperas, logs, interacciones, extracciones, validaciones, control de flujo, patrones recomendados y ejemplo POST de `projects/example`.
- Se recreo `docs/actions.md` como indice rapido hacia la guia completa y catalogo de acciones disponibles.
- Se actualizo `README.md` para apuntar al manual `docs/guide.md` como referencia principal al crear secuencias de pasos.
- Se refactorizo `src/routes/scraper-routes.js` extrayendo helpers para ejecutar pasos con pagina administrada, responder resultados y manejar errores sin cambiar los contratos HTTP actuales.
- Se refactorizo `projects/redirect.js` separando creacion de errores SDK, validacion de status HTTP y construccion de `runSteps`, manteniendo la carga de `projects/<project>/start.js`.
- Se refactorizo `src/lib/action-handler.js` extrayendo la creacion de registros de exito y fallo para reducir duplicacion en el flujo de reintentos.
- Se elimino `examples/simple-flow.js` porque no estaba referenciado por scripts, documentacion ni codigo del SDK.
- Se amplio `pnpm run check` para validar tambien `src/routes/scraper-routes.js` y `src/lib/action-handler.js`.
- Se actualizo `README.md` con una prueba POST completa para `/example`, estructura de carpetas, guia de trabajo en `/projects` y lista de archivos sensibles que no deben tocarse salvo cambios conscientes del SDK.
- Se reorganizo `docs/actions.md` para dejar los ejemplos de `loop` dentro de control de flujo y agregar la prueba de `/projects/example`.

## 2026-05-28

- Se agrego `AGENT.md` para fijar reglas de trabajo del SDK, arquitectura esperada y obligacion de mantener `README.md`, `docs/actions.md` y `changelog.md` actualizados en cada cambio.
- Se amplio `src/lib/browser-manager.js` para centralizar Google Chrome, soportar `keep-open` con limpieza a una pestana `about:blank`, `close-after-request` y persistencia opcional de sesion con `PUPPETEER_USER_DATA_DIR`.
- Se agregaron variables de entorno en `src/config/env.js` y `.env.example` para `PROJECTS_ROOT`, canal/ruta de Chrome, modo de browser y persistencia de cookies/datos.
- Se monto `projects/redirect.js` desde `src/app.js` en `POST /projects` y `POST /api/projects`; el redirect carga `projects/<project>/start.js`, valida rutas dentro de `/projects` y expone `runSteps`.
- Se valido el status HTTP devuelto por proyectos para usar un fallback seguro (`200` o `422`) si el proyecto no devuelve un codigo numerico valido.
- Se agrego `projects/example` con `start.js` y `steps/step_1.js` para buscar `hola` en Google y devolver el titulo del primer resultado dentro del body de respuesta.
- Se agrego la accion `consoleLog`/`log` y captura de eventos `console`/`pageerror` en `src/lib/action-handler.js` y `src/lib/context.js`, dejando los mensajes en `result.context.console`.
- Se actualizaron scripts de `package.json` para que `pnpm run start` ejecute headless y `pnpm run dev` abra ventana de Chrome mediante `scripts/run-server.js`.
- Se cambio `pnpm run dev` para no usar `node --watch` por defecto y evitar reinicios que pierdan la referencia al Chrome persistente; se agrego `pnpm run dev:watch` como opcion explicita.
- Se reforzo `src/lib/browser-manager.js` con una promesa unica de lanzamiento, seguimiento de paginas activas y reconexion por `PUPPETEER_REMOTE_DEBUGGING_PORT` para que `keep-open` reutilice Chrome y no intente relanzar el mismo `userDataDir`.
- Se agrego `PUPPETEER_REMOTE_DEBUGGING_PORT` en `src/config/env.js` y `.env.example`.
- Se amplio `pnpm run check` para validar tambien `src/config/env.js` y `src/lib/browser-manager.js`.
- Se agrego `pm2/ecosystem.config.cjs` para levantar el servicio en produccion con PM2.
- Se agregaron instaladores `install/ubuntu.sh` e `install/windows.ps1` para instalar Node.js 20+, Google Chrome, `pnpm`, `pm2`, dependencias y verificaciones.
- Se agrego `pnpm-workspace.yaml` con `allowBuilds.puppeteer=false` para evitar descargas/builds de navegadores y mantener el uso de Google Chrome del sistema.
- Se ajustaron los instaladores para exportar `PUPPETEER_SKIP_DOWNLOAD=true` antes de instalar dependencias.
- Se agregaron scripts `pnpm run install-ubuntu` y `pnpm run install-windows` en `package.json` para ejecutar los instaladores desde pnpm.
- Se agrego `test/console-action.test.js` para cubrir la accion `consoleLog`.
- Se actualizo `README.md` y `docs/actions.md` con configuracion de Chrome, contratos de `/projects`, logs, PM2 e instalacion.
