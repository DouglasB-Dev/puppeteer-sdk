import { sleep } from '../utils/sleep.js';

export const waitActions = {
  async wait({ step }) {
    const { duration = 1000 } = step;
    await sleep(duration);
    return { action: 'wait', duration };
  },

  async waitForSelector({ page, step }) {
    const { selector, timeout = 10000, hidden = false, visible = false } = step;
    await page.waitForSelector(selector, { timeout, hidden, visible });
    return { action: 'waitForSelector', selector, hidden, visible };
  },

  async waitForNavigation({ page, step }) {
    const { waitUntil = 'networkidle2', timeout = 30000 } = step;
    await page.waitForNavigation({ waitUntil, timeout });
    return { action: 'waitForNavigation', url: page.url() };
  },

  async waitForFunction({ page, step }) {
    const { fn, args = [], timeout = 30000, polling = 'raf' } = step;
    if (!fn) throw new Error('waitForFunction requiere fn');
    await page.waitForFunction(fn, { timeout, polling }, ...args);
    return { action: 'waitForFunction' };
  },

  async waitForNetworkIdle({ page, step }) {
    const { idleTime = 500, timeout = 30000 } = step;
    if (typeof page.waitForNetworkIdle !== 'function') {
      await sleep(idleTime);
      return { action: 'waitForNetworkIdle', fallback: 'sleep', idleTime };
    }
    await page.waitForNetworkIdle({ idleTime, timeout });
    return { action: 'waitForNetworkIdle', idleTime };
  }
};
