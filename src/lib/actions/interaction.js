import { sleep } from '../utils/sleep.js';

const getLocator = (page, selector, timeout) => {
  if (typeof page.locator !== 'function') return null;
  const locator = page.locator(selector);
  return typeof locator.setTimeout === 'function' ? locator.setTimeout(timeout) : locator;
};

const waitForElement = async (page, selector, timeout = 5000, visible = true) => {
  return page.waitForSelector(selector, { timeout, visible });
};

export const interactionActions = {
  async click({ page, step }) {
    const {
      selector,
      timeout = 5000,
      waitAfter = 0,
      waitForNavigation = false,
      waitUntil = 'networkidle2',
      navigationTimeout = 30000,
      button = 'left',
      clickCount = 1,
      delay = 0,
      useLocator = true
    } = step;

    const doClick = async () => {
      const locator = getLocator(page, selector, timeout);
      if (locator && useLocator && clickCount === 1 && button === 'left' && delay === 0) {
        await locator.click();
      } else {
        await waitForElement(page, selector, timeout, true);
        await page.click(selector, { button, clickCount, delay });
      }
    };

    if (waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ waitUntil, timeout: navigationTimeout }),
        doClick()
      ]);
    } else {
      await doClick();
      if (waitAfter > 0) await sleep(waitAfter);
    }

    return { action: 'click', selector, url: page.url() };
  },

  async type({ page, step }) {
    const { selector, text, clearFirst = true, delay = 0, timeout = 5000, useLocator = true } = step;
    const value = text == null ? '' : String(text);
    const locator = getLocator(page, selector, timeout);

    if (locator && useLocator && clearFirst && delay === 0 && typeof locator.fill === 'function') {
      await locator.fill(value);
    } else {
      await waitForElement(page, selector, timeout, true);
      await page.click(selector);

      if (clearFirst) {
        await page.$eval(selector, (element) => {
          if ('value' in element) {
            element.value = '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.textContent = '';
          }
        });
      }

      await page.type(selector, value, { delay });
    }

    return { action: 'type', selector, length: value.length };
  },

  async select({ page, step }) {
    const { selector, value, text, timeout = 5000 } = step;
    await waitForElement(page, selector, timeout, true);

    if (value !== undefined) {
      await page.select(selector, String(value));
    } else if (text !== undefined) {
      await page.evaluate((selectSelector, optionText) => {
        const select = document.querySelector(selectSelector);
        if (!select) throw new Error(`Select no encontrado: ${selectSelector}`);
        const option = Array.from(select.options).find((item) => item.text.trim() === String(optionText).trim());
        if (!option) throw new Error(`Opcion no encontrada: ${optionText}`);
        select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, selector, text);
    } else {
      throw new Error('select requiere value o text');
    }

    return { action: 'select', selector, selected: value ?? text };
  },

  async hover({ page, step }) {
    const { selector, timeout = 5000, useLocator = true } = step;
    const locator = getLocator(page, selector, timeout);

    if (locator && useLocator && typeof locator.hover === 'function') {
      await locator.hover();
    } else {
      await waitForElement(page, selector, timeout, true);
      await page.hover(selector);
    }

    return { action: 'hover', selector };
  },

  async scroll({ page, step }) {
    const { selector, amount = 500, direction = 'down', waitAfter = 250, behavior = 'smooth' } = step;

    if (selector) {
      await page.evaluate(({ selector: targetSelector, behavior: scrollBehavior }) => {
        const element = document.querySelector(targetSelector);
        if (!element) throw new Error(`Elemento no encontrado para scroll: ${targetSelector}`);
        element.scrollIntoView({ behavior: scrollBehavior, block: 'center', inline: 'center' });
      }, { selector, behavior });
    } else {
      const signedAmount = direction === 'up' ? -Math.abs(amount) : Math.abs(amount);
      await page.evaluate(({ top, behavior: scrollBehavior }) => {
        window.scrollBy({ top, left: 0, behavior: scrollBehavior });
      }, { top: signedAmount, behavior });
    }

    if (waitAfter > 0) await sleep(waitAfter);
    return { action: 'scroll', selector: selector ?? null, amount, direction };
  },

  async press({ page, step }) {
    const { key, delay = 0 } = step;
    await page.keyboard.press(key, { delay });
    return { action: 'press', key };
  },

  async uploadFile({ page, step }) {
    const { selector, filePaths, timeout = 5000 } = step;
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const input = await waitForElement(page, selector, timeout, true);
    await input.uploadFile(...paths);
    return { action: 'uploadFile', selector, files: paths };
  }
};
