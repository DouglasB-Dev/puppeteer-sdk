import dotenv from 'dotenv';

dotenv.config();

const toBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
};

const toNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const toBrowserMode = (value) => {
  const mode = String(value ?? 'keep-open').toLowerCase();
  return mode === 'close-after-request' ? mode : 'keep-open';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 3000),
  baseUrl: process.env.SCRAPER_BASE_URL ?? 'https://example.com',
  projectsRoot: process.env.PROJECTS_ROOT ?? 'projects',
  puppeteer: {
    headless: toBoolean(process.env.PUPPETEER_HEADLESS, true),
    slowMo: toNumber(process.env.PUPPETEER_SLOW_MO, 0),
    defaultTimeout: toNumber(process.env.PUPPETEER_DEFAULT_TIMEOUT, 30000),
    navigationTimeout: toNumber(process.env.PUPPETEER_NAVIGATION_TIMEOUT, 45000),
    browserMode: toBrowserMode(process.env.PUPPETEER_BROWSER_MODE),
    persistSession: toBoolean(process.env.PUPPETEER_PERSIST_SESSION, false),
    userDataDir: process.env.PUPPETEER_USER_DATA_DIR ?? 'storage/chrome-profile',
    remoteDebuggingPort: toNumber(process.env.PUPPETEER_REMOTE_DEBUGGING_PORT, 9222),
    channel: process.env.PUPPETEER_BROWSER_CHANNEL ?? 'chrome',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    viewport: {
      width: toNumber(process.env.PUPPETEER_VIEWPORT_WIDTH, 1365),
      height: toNumber(process.env.PUPPETEER_VIEWPORT_HEIGHT, 768)
    }
  }
};
