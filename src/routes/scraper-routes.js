import express from 'express';
import { createActionHandler } from '../lib/action-handler.js';
import { loginFlows } from '../flows/login-flow.js';
import { scrapeOffersFlows } from '../flows/scrape-offers-flow.js';
import { validationFlows } from '../flows/validation-flow.js';

const withPage = async (browserManager, pageOptions, callback) => {
  if (typeof browserManager.withPage === 'function') {
    return browserManager.withPage(pageOptions, callback);
  }

  const page = await browserManager.newPage(pageOptions);
  try {
    return await callback(page);
  } finally {
    if (typeof browserManager.cleanupAfterRequest === 'function') {
      await browserManager.cleanupAfterRequest(page);
    } else {
      await page.close().catch(() => null);
    }
  }
};

const sendExecutionResult = (res, result) => {
  return res.status(result.success ? 200 : 422).json(result);
};

const sendServerError = (res, error) => {
  return res.status(500).json({ success: false, error: error.message });
};

const executeStepsWithPage = async (browserManager, actionHandler, {
  steps,
  options = {},
  variables = {},
  data = {},
  pageOptions = {}
}) => {
  return withPage(browserManager, pageOptions, (page) => actionHandler.executeSteps(page, steps, {
    ...options,
    variables,
    data
  }));
};

const executeFlow = async (browserManager, actionHandler, {
  flow,
  flowOptions = {},
  options = {},
  variables = {},
  pageOptions = {}
}) => {
  const steps = flow(flowOptions);
  return executeStepsWithPage(browserManager, actionHandler, {
    steps,
    options,
    variables,
    pageOptions
  });
};

export const createScraperRouter = ({ browserManager, actionHandler = createActionHandler() }) => {
  const router = express.Router();

  router.get('/actions', (req, res) => {
    res.json({ actions: actionHandler.listActions() });
  });

  router.post('/execute', async (req, res) => {
    const { steps, options = {}, variables = {}, data = {}, pageOptions = {} } = req.body;

    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: 'Se requiere steps como array de acciones' });
    }

    try {
      const result = await executeStepsWithPage(browserManager, actionHandler, {
        steps,
        options,
        variables,
        data,
        pageOptions
      });
      return sendExecutionResult(res, result);
    } catch (error) {
      return sendServerError(res, error);
    }
  });

  router.post('/flows/login', async (req, res) => {
    const { username, password, type = 'standardLogin', options = {}, variables = {}, pageOptions = {}, ...flowOptions } = req.body;

    if (!username || !password) return res.status(400).json({ error: 'username y password son requeridos' });
    if (!loginFlows[type]) return res.status(400).json({ error: `Flujo de login no valido: ${type}` });

    try {
      const result = await executeFlow(browserManager, actionHandler, {
        flow: loginFlows[type],
        flowOptions: { username, password, ...flowOptions },
        options,
        variables,
        pageOptions
      });
      return sendExecutionResult(res, result);
    } catch (error) {
      return sendServerError(res, error);
    }
  });

  router.post('/flows/offers', async (req, res) => {
    const { type = 'list', options = {}, variables = {}, pageOptions = {}, ...flowOptions } = req.body;

    if (!scrapeOffersFlows[type]) return res.status(400).json({ error: `Tipo de flujo no valido: ${type}` });

    try {
      const result = await executeFlow(browserManager, actionHandler, {
        flow: scrapeOffersFlows[type],
        flowOptions,
        options,
        variables,
        pageOptions
      });
      return sendExecutionResult(res, result);
    } catch (error) {
      return sendServerError(res, error);
    }
  });

  router.post('/flows/validate-page', async (req, res) => {
    const { type = 'pageIntegrity', options = {}, variables = {}, pageOptions = {}, ...flowOptions } = req.body;

    if (!validationFlows[type]) return res.status(400).json({ error: `Tipo de validacion no valido: ${type}` });

    try {
      const result = await executeFlow(browserManager, actionHandler, {
        flow: validationFlows[type],
        flowOptions,
        options,
        variables,
        pageOptions
      });
      return sendExecutionResult(res, result);
    } catch (error) {
      return sendServerError(res, error);
    }
  });

  return router;
};
