import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeFields } from '../utils/extract-field.js';

const readSelectorValue = async (page, selector, attribute, timeout) => {
  await page.waitForSelector(selector, { timeout });
  return page.$eval(selector, (element, attr) => {
    if (attr === 'textContent' || attr === 'text') return element.textContent?.trim() ?? '';
    if (attr === 'innerText') return element.innerText?.trim() ?? '';
    if (attr === 'innerHTML') return element.innerHTML;
    if (attr === 'outerHTML') return element.outerHTML;
    return element.getAttribute(attr);
  }, attribute);
};

const readMultipleValues = async (page, selector, attribute, timeout) => {
  await page.waitForSelector(selector, { timeout });
  return page.$$eval(selector, (elements, attr) => elements.map((element) => {
    if (attr === 'textContent' || attr === 'text') return element.textContent?.trim() ?? '';
    if (attr === 'innerText') return element.innerText?.trim() ?? '';
    if (attr === 'innerHTML') return element.innerHTML;
    if (attr === 'outerHTML') return element.outerHTML;
    return element.getAttribute(attr);
  }), attribute);
};

export const extractionActions = {
  async extractText({ page, step, context }) {
    const { selector, attribute = 'textContent', saveAs, timeout = 5000, multiple = false } = step;
    const data = multiple
      ? await readMultipleValues(page, selector, attribute, timeout)
      : await readSelectorValue(page, selector, attribute, timeout);

    if (saveAs) context.set(saveAs, data);
    return { action: 'extractText', selector, attribute, data, savedAs: saveAs ?? null };
  },

  async extractList({ page, step, context }) {
    const { selector, fields, saveAs, timeout = 5000, allowEmpty = false } = step;
    const normalizedFields = normalizeFields(fields);

    if (!allowEmpty) await page.waitForSelector(selector, { timeout });

    const items = await page.$$eval(selector, (elements, browserFields) => {
      const readFromElement = (root, spec) => {
        if (spec == null) return null;

        if (typeof spec === 'object') {
          if ('value' in spec) return spec.value;
          const target = spec.selector ? root.querySelector(spec.selector) : root;
          if (!target) return spec.fallback ?? null;
          const attr = spec.attr ?? spec.attribute ?? 'textContent';
          if (attr === 'textContent' || attr === 'text') return target.textContent?.trim() ?? '';
          if (attr === 'innerText') return target.innerText?.trim() ?? '';
          if (attr === 'innerHTML') return target.innerHTML;
          if (attr === 'outerHTML') return target.outerHTML;
          return target.getAttribute(attr) ?? spec.fallback ?? null;
        }

        const value = String(spec).trim();
        if (value === 'text()' || value === 'textContent' || value === 'text') return root.textContent?.trim() ?? '';
        if (value === 'html()' || value === 'innerHTML') return root.innerHTML;
        if (value === 'outerHTML') return root.outerHTML;
        if (value.startsWith('@')) return root.getAttribute(value.slice(1));

        const attributeMatch = value.match(/^(.*?)@([\w:-]+)$/);
        if (attributeMatch) {
          const [, childSelector, attr] = attributeMatch;
          const target = childSelector ? root.querySelector(childSelector) : root;
          return target ? target.getAttribute(attr) : null;
        }

        const target = root.querySelector(value);
        return target ? target.textContent?.trim() ?? '' : null;
      };

      return elements.map((element, index) => {
        const item = { _index: index };
        for (const [key, spec] of Object.entries(browserFields)) {
          item[key] = readFromElement(element, spec);
        }
        return item;
      });
    }, normalizedFields);

    if (saveAs) context.set(saveAs, items);
    return { action: 'extractList', selector, count: items.length, data: items, savedAs: saveAs ?? null };
  },

  async extractHTML({ page, step, context }) {
    const { selector, saveAs, timeout = 5000, outer = true } = step;
    const html = selector
      ? await readSelectorValue(page, selector, outer ? 'outerHTML' : 'innerHTML', timeout)
      : await page.evaluate(() => document.documentElement.outerHTML);

    if (saveAs) context.set(saveAs, html);
    return { action: 'extractHTML', selector: selector ?? 'document', dataSize: html.length, data: html, savedAs: saveAs ?? null };
  },

  async extractAttribute({ page, step, context }) {
    const { selector, attribute, saveAs, timeout = 5000 } = step;
    const value = await readSelectorValue(page, selector, attribute, timeout);
    if (saveAs) context.set(saveAs, value);
    return { action: 'extractAttribute', selector, attribute, value, savedAs: saveAs ?? null };
  },

  async extractTable({ page, step, context }) {
    const { selector, saveAs, timeout = 5000, includeHeaders = true } = step;
    await page.waitForSelector(selector, { timeout });

    const rows = await page.$eval(selector, (table, useHeaders) => {
      const headerCells = Array.from(table.querySelectorAll('thead th')).map((cell) => cell.textContent.trim());
      const bodyRows = Array.from(table.querySelectorAll('tbody tr, tr')).filter((row) => row.querySelectorAll('td').length > 0);

      return bodyRows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
        if (!useHeaders || headerCells.length === 0) return cells;
        return Object.fromEntries(cells.map((cell, index) => [headerCells[index] ?? `column_${index + 1}`, cell]));
      });
    }, includeHeaders);

    if (saveAs) context.set(saveAs, rows);
    return { action: 'extractTable', selector, count: rows.length, data: rows, savedAs: saveAs ?? null };
  },

  async screenshot({ page, step, context }) {
    const { selector, fullPage = false, saveAs, encoding, path, timeout = 5000, omitBackground = false } = step;
    const screenshotOptions = { fullPage, omitBackground };

    if (path) {
      await mkdir(dirname(path), { recursive: true });
      screenshotOptions.path = path;
    }
    if (encoding) screenshotOptions.encoding = encoding;

    let data;
    if (selector) {
      const element = await page.waitForSelector(selector, { timeout });
      data = await element.screenshot(screenshotOptions);
    } else {
      data = await page.screenshot(screenshotOptions);
    }

    const stored = path ? { path } : data;
    if (saveAs) context.set(saveAs, stored);
    if (path) context.addArtifact({ type: 'screenshot', path, selector: selector ?? null });

    return {
      action: 'screenshot',
      selector: selector ?? 'page',
      path: path ?? null,
      dataSize: typeof data === 'string' || Buffer.isBuffer(data) ? data.length : 0,
      savedAs: saveAs ?? null
    };
  }
};
