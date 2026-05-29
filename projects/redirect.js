import express from 'express';
import { access } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createActionHandler } from '../src/lib/action-handler.js';
import { env } from '../src/config/env.js';

const SDK_STATUS = {
  missingProject: 'SDK_PROJECT_REQUIRED',
  invalidProject: 'SDK_PROJECT_INVALID',
  missingEntry: 'SDK_PROJECT_ENTRY_NOT_FOUND',
  invalidEntry: 'SDK_PROJECT_ENTRY_INVALID',
  invalidSteps: 'SDK_INVALID_STEPS',
  executionError: 'PROJECT_EXECUTION_ERROR'
};

const DEFAULT_ENTRY = 'start.js';

const isInside = (root, target) => {
  const output = relative(root, target);
  return output === '' || (!output.startsWith('..') && !isAbsolute(output));
};

const createSdkError = (message, statusCode, sdkStatus) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.sdkStatus = sdkStatus;
  return error;
};

const normalizeProjectName = (project) => String(project ?? '')
  .trim()
  .replace(/\\/g, '/')
  .replace(/^\/+/, '')
  .replace(/\/+$/, '');

const resolveInside = (root, value) => {
  const target = resolve(root, value);
  if (!isInside(root, target)) {
    throw createSdkError('La ruta solicitada queda fuera de /projects', 400, SDK_STATUS.invalidProject);
  }
  return target;
};

const sendSdkError = (res, statusCode, status, message, details = undefined) => {
  return res.status(statusCode).json({
    success: false,
    status,
    message,
    ...(details ? { details } : {})
  });
};

const loadProjectStart = async (entryPath) => {
  await access(entryPath);
  const url = `${pathToFileURL(entryPath).href}?t=${Date.now()}`;
  const mod = await import(url);
  const start = mod.default ?? mod.start;
  if (typeof start !== 'function') {
    throw createSdkError('El entry del proyecto debe exportar default o start como funcion', 500, SDK_STATUS.invalidEntry);
  }
  return start;
};

const isValidHttpStatus = (status) => {
  return Number.isInteger(status) && status >= 100 && status <= 599;
};

const sendProjectResult = (res, result) => {
  const fallbackStatus = result?.success === false ? 422 : 200;
  const requestedStatus = Number(result?.status ?? result?.statusCode ?? fallbackStatus);
  const status = isValidHttpStatus(requestedStatus) ? requestedStatus : fallbackStatus;
  const body = result?.body ?? result;
  return res.status(status).json(body ?? { success: true });
};

const createProjectRunner = ({
  actionHandler,
  body,
  browserManager,
  projectName,
  projectRoot
}) => {
  return async (steps, runOptions = {}) => {
    if (!Array.isArray(steps)) {
      throw createSdkError('runSteps requiere un array de acciones', 500, SDK_STATUS.invalidSteps);
    }

    const pageOptions = {
      ...(body.pageOptions ?? {}),
      ...(runOptions.pageOptions ?? {})
    };

    const variables = {
      project: projectName,
      ...(body.variables ?? {}),
      ...(runOptions.variables ?? {})
    };

    const data = {
      ...(body.data ?? {}),
      ...(runOptions.data ?? {})
    };

    return browserManager.withPage(pageOptions, (page) => actionHandler.executeSteps(page, steps, {
      ...(body.options ?? {}),
      ...(runOptions.options ?? {}),
      variables,
      data,
      meta: {
        project: projectName,
        projectRoot,
        requestBody: body,
        ...(runOptions.meta ?? {})
      }
    }));
  };
};

export const createProjectRedirectRouter = ({
  browserManager,
  actionHandler = createActionHandler(),
  projectsRoot = resolve(process.cwd(), env.projectsRoot)
} = {}) => {
  const router = express.Router();
  const root = resolve(projectsRoot);

  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const projectName = normalizeProjectName(body.project);
    const entry = body.entry ? String(body.entry) : DEFAULT_ENTRY;

    if (!projectName) {
      return sendSdkError(res, 400, SDK_STATUS.missingProject, 'Se requiere body.project con el nombre de una carpeta en /projects');
    }

    let projectRoot;
    let entryPath;

    try {
      projectRoot = resolveInside(root, projectName);
      entryPath = resolveInside(projectRoot, entry);
    } catch (error) {
      return sendSdkError(res, error.statusCode ?? 400, error.sdkStatus ?? SDK_STATUS.invalidProject, error.message);
    }

    try {
      const start = await loadProjectStart(entryPath);
      const runSteps = createProjectRunner({
        actionHandler,
        body,
        browserManager,
        projectName,
        projectRoot
      });

      const result = await start({
        project: projectName,
        projectRoot,
        entryPath,
        body,
        req,
        runSteps,
        browserManager,
        actionHandler
      });

      return sendProjectResult(res, result);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return sendSdkError(res, 404, SDK_STATUS.missingEntry, `No se encontro ${entry} para el proyecto ${projectName}`);
      }

      return sendSdkError(
        res,
        error.statusCode ?? 500,
        error.sdkStatus ?? SDK_STATUS.executionError,
        error.message
      );
    }
  });

  return router;
};
