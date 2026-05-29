import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';
import { env } from '../config/env.js';

const isConnected = (browser) => Boolean(browser && typeof browser.isConnected === 'function' && browser.isConnected());

const normalizeBrowserMode = (mode) => (mode === 'close-after-request' ? mode : 'keep-open');

const isUserDataDirLockedError = (error) => {
  const message = String(error?.message ?? error);
  return message.includes('The browser is already running') && message.includes('userDataDir');
};

const fetchBrowserWSEndpoint = async (port) => {
  if (!port || typeof fetch !== 'function') return null;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.webSocketDebuggerUrl === 'string' ? data.webSocketDebuggerUrl : null;
  } catch {
    return null;
  }
};

const createIsolatedContext = async (browser) => {
  if (typeof browser.createBrowserContext === 'function') return browser.createBrowserContext();
  if (typeof browser.createIncognitoBrowserContext === 'function') return browser.createIncognitoBrowserContext();
  return browser.defaultBrowserContext();
};

const isClosedPage = (page) => Boolean(typeof page?.isClosed === 'function' && page.isClosed());

export const createBrowserManager = ({
  launchOptions = {},
  pageOptions = {},
  browserMode = env.puppeteer.browserMode,
  persistSession = env.puppeteer.persistSession,
  userDataDir = env.puppeteer.userDataDir
} = {}) => {
  let browser = null;
  let launchPromise = null;
  const pageContexts = new WeakMap();
  const activePages = new Set();
  const mode = normalizeBrowserMode(browserMode);
  const shouldPersistSession = Boolean(persistSession);
  const resolvedUserDataDir = userDataDir ? resolve(userDataDir) : undefined;
  const remoteDebuggingPort = env.puppeteer.remoteDebuggingPort;
  const remoteDebuggingArg = remoteDebuggingPort ? [`--remote-debugging-port=${remoteDebuggingPort}`] : [];

  const chromeTarget = env.puppeteer.executablePath
    ? { executablePath: env.puppeteer.executablePath }
    : { channel: env.puppeteer.channel };

  const resolvedLaunchOptions = {
    headless: env.puppeteer.headless,
    slowMo: env.puppeteer.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...remoteDebuggingArg],
    ...chromeTarget,
    ...(shouldPersistSession && resolvedUserDataDir ? { userDataDir: resolvedUserDataDir } : {}),
    ...launchOptions
  };

  resolvedLaunchOptions.args = [
    ...new Set([
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...remoteDebuggingArg,
      ...(launchOptions.args ?? [])
    ])
  ];

  const applyPageOptions = async (page, options = {}) => {
    const viewport = options.viewport ?? pageOptions.viewport ?? env.puppeteer.viewport;
    if (viewport) await page.setViewport(viewport);

    const defaultTimeout = options.defaultTimeout ?? pageOptions.defaultTimeout ?? env.puppeteer.defaultTimeout;
    const navigationTimeout = options.navigationTimeout ?? pageOptions.navigationTimeout ?? env.puppeteer.navigationTimeout;
    page.setDefaultTimeout(defaultTimeout);
    page.setDefaultNavigationTimeout(navigationTimeout);

    const userAgent = options.userAgent ?? pageOptions.userAgent;
    if (userAgent) await page.setUserAgent(userAgent);

    return page;
  };

  const resetToSingleBlankPage = async () => {
    if (!isConnected(browser)) return;

    const pages = await browser.pages().catch(() => []);
    let blankPage = pages.find((page) => !activePages.has(page) && !isClosedPage(page) && page.url() === 'about:blank');

    if (!blankPage) {
      blankPage = pages.find((page) => !activePages.has(page) && !isClosedPage(page)) ?? await browser.newPage();
      if (!isClosedPage(blankPage) && blankPage.url() !== 'about:blank') {
        await blankPage.goto('about:blank').catch(() => null);
      }
    }

    await Promise.all(pages
      .filter((page) => page !== blankPage && !activePages.has(page) && !isClosedPage(page))
      .map((page) => page.close().catch(() => null)));

    await blankPage?.bringToFront?.().catch(() => null);
  };

  const connectToExistingBrowser = async () => {
    if (mode !== 'keep-open' || !remoteDebuggingPort) return null;

    const browserWSEndpoint = await fetchBrowserWSEndpoint(remoteDebuggingPort);
    if (!browserWSEndpoint) return null;

    return puppeteer.connect({ browserWSEndpoint });
  };

  const launchOrConnect = async () => {
    if (shouldPersistSession && resolvedUserDataDir) {
      await mkdir(resolvedUserDataDir, { recursive: true });
    }

    const existingBrowser = await connectToExistingBrowser();
    if (isConnected(existingBrowser)) return existingBrowser;

    try {
      return await puppeteer.launch(resolvedLaunchOptions);
    } catch (error) {
      if (!isUserDataDirLockedError(error)) throw error;

      const connectedBrowser = await connectToExistingBrowser();
      if (isConnected(connectedBrowser)) return connectedBrowser;

      throw new Error(
        `${error.message} No pude reconectar al Chrome existente por el puerto ${remoteDebuggingPort}. ` +
        'Cierra ese Chrome una vez o usa otro PUPPETEER_USER_DATA_DIR; despues el manager reutilizara la instancia en keep-open.'
      );
    }
  };

  const api = {
    config: {
      browserMode: mode,
      persistSession: shouldPersistSession,
      userDataDir: shouldPersistSession ? resolvedUserDataDir : null,
      remoteDebuggingPort,
      channel: resolvedLaunchOptions.channel ?? null,
      executablePath: resolvedLaunchOptions.executablePath ?? null
    },

    async getBrowser() {
      if (isConnected(browser)) return browser;

      if (!launchPromise) {
        launchPromise = launchOrConnect()
          .then(async (activeBrowser) => {
            browser = activeBrowser;
            if (mode === 'keep-open') await resetToSingleBlankPage();
            return browser;
          })
          .finally(() => {
            launchPromise = null;
          });
      }

      await launchPromise;
      return browser;
    },

    async newPage(options = {}) {
      const activeBrowser = await this.getBrowser();
      const context = shouldPersistSession
        ? activeBrowser.defaultBrowserContext()
        : await createIsolatedContext(activeBrowser);
      const page = await context.newPage();

      pageContexts.set(page, context);
      activePages.add(page);
      page.once?.('close', () => {
        pageContexts.delete(page);
        activePages.delete(page);
      });

      return applyPageOptions(page, options);
    },

    async cleanupAfterRequest(page) {
      const activeBrowser = browser;
      const context = page ? pageContexts.get(page) : null;
      const defaultContext = activeBrowser?.defaultBrowserContext?.();

      if (mode === 'close-after-request') {
        await this.close();
        return;
      }

      if (context && context !== defaultContext && typeof context.close === 'function') {
        await context.close().catch(() => null);
      } else if (page && !isClosedPage(page)) {
        await page.close().catch(() => null);
      }

      if (page) {
        pageContexts.delete(page);
        activePages.delete(page);
      }

      if (activePages.size === 0) await resetToSingleBlankPage();
    },

    async withPage(options = {}, callback) {
      const page = await this.newPage(options);
      try {
        return await callback(page);
      } finally {
        await this.cleanupAfterRequest(page);
      }
    },

    async close() {
      if (browser) {
        await browser.close().catch(() => null);
        browser = null;
      }
    }
  };

  return api;
};
