import { evaluateCondition } from '../utils/evaluate-condition.js';

const normalizeText = (value, normalizeSpace = true) => {
  const text = String(value ?? '');
  return normalizeSpace ? text.replace(/\s+/g, ' ').trim() : text;
};

export const validationActions = {
  async validateUrl({ page, step, context }) {
    const { expectedPattern, expectedExact, expectedContains, saveAs } = step;
    const currentUrl = page.url();

    const checks = [];
    if (expectedPattern) {
      const regex = expectedPattern instanceof RegExp ? expectedPattern : new RegExp(expectedPattern);
      checks.push({ name: 'pattern', ok: regex.test(currentUrl), expected: regex.toString() });
    }
    if (expectedExact) checks.push({ name: 'exact', ok: currentUrl === expectedExact, expected: expectedExact });
    if (expectedContains) checks.push({ name: 'contains', ok: currentUrl.includes(expectedContains), expected: expectedContains });

    const isValid = checks.length === 0 ? true : checks.every((check) => check.ok);
    const validation = { currentUrl, isValid, checks };
    if (saveAs) context.set(saveAs, validation);
    if (!isValid) throw new Error(`Validacion de URL fallo. URL actual: ${currentUrl}. Checks: ${JSON.stringify(checks)}`);

    return { action: 'validateUrl', validation, savedAs: saveAs ?? null };
  },

  async validateSelector({ page, step, context }) {
    const { selector, shouldExist = true, timeout = 5000, visible = false, saveAs } = step;

    if (shouldExist) {
      await page.waitForSelector(selector, { timeout, visible });
    } else {
      const exists = (await page.$(selector)) !== null;
      if (exists) {
        await page.waitForSelector(selector, { timeout, hidden: true }).catch(() => null);
      }
    }

    const exists = (await page.$(selector)) !== null;
    const validation = { selector, exists, shouldExist, isValid: exists === shouldExist };

    if (saveAs) context.set(saveAs, validation);
    if (!validation.isValid) throw new Error(`Validacion de selector fallo: ${selector}. exists=${exists}, shouldExist=${shouldExist}`);

    return { action: 'validateSelector', validation, savedAs: saveAs ?? null };
  },

  async validateText({ page, step, context }) {
    const { selector, expectedText, containsText, matchPattern, saveAs, timeout = 5000, normalizeSpace = true } = step;
    await page.waitForSelector(selector, { timeout });

    const rawText = await page.$eval(selector, (element) => element.textContent ?? '');
    const actualText = normalizeText(rawText, normalizeSpace);
    const checks = [];

    if (expectedText !== undefined) checks.push({ name: 'exact', ok: actualText === normalizeText(expectedText, normalizeSpace), expected: expectedText });
    if (containsText !== undefined) checks.push({ name: 'contains', ok: actualText.includes(normalizeText(containsText, normalizeSpace)), expected: containsText });
    if (matchPattern !== undefined) {
      const regex = matchPattern instanceof RegExp ? matchPattern : new RegExp(matchPattern);
      checks.push({ name: 'pattern', ok: regex.test(actualText), expected: regex.toString() });
    }

    const isValid = checks.length === 0 ? actualText.length > 0 : checks.every((check) => check.ok);
    const validation = { selector, actualText, isValid, checks };

    if (saveAs) context.set(saveAs, validation);
    if (!isValid) throw new Error(`Validacion de texto fallo en ${selector}. Texto actual: ${actualText}`);

    return { action: 'validateText', validation, savedAs: saveAs ?? null };
  },

  async validateCondition({ page, step, context }) {
    const { condition, args = [], saveAs, message = 'Validacion de condicion fallo' } = step;
    const result = await evaluateCondition({ page, context, condition, args });
    const validation = { isValid: Boolean(result), result };

    if (saveAs) context.set(saveAs, validation);
    if (!result) throw new Error(message);

    return { action: 'validateCondition', validation, savedAs: saveAs ?? null };
  },

  async validateData({ step, context }) {
    const { path, equals, notEquals, includes, exists, minLength, maxLength, matches, saveAs } = step;
    const value = context.get(path);
    const checks = [];

    if (exists !== undefined) checks.push({ name: 'exists', ok: exists ? value !== undefined && value !== null : value === undefined || value === null, expected: exists });
    if (equals !== undefined) checks.push({ name: 'equals', ok: value === equals, expected: equals });
    if (notEquals !== undefined) checks.push({ name: 'notEquals', ok: value !== notEquals, expected: notEquals });
    if (includes !== undefined) checks.push({ name: 'includes', ok: Array.isArray(value) || typeof value === 'string' ? value.includes(includes) : false, expected: includes });
    if (minLength !== undefined) checks.push({ name: 'minLength', ok: value?.length >= minLength, expected: minLength });
    if (maxLength !== undefined) checks.push({ name: 'maxLength', ok: value?.length <= maxLength, expected: maxLength });
    if (matches !== undefined) checks.push({ name: 'matches', ok: new RegExp(matches).test(String(value ?? '')), expected: matches });

    const isValid = checks.length === 0 ? Boolean(value) : checks.every((check) => check.ok);
    const validation = { path, value, isValid, checks };

    if (saveAs) context.set(saveAs, validation);
    if (!isValid) throw new Error(`Validacion de data fallo para ${path}. Checks: ${JSON.stringify(checks)}`);

    return { action: 'validateData', validation, savedAs: saveAs ?? null };
  }
};
