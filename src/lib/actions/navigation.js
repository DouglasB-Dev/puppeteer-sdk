export const navigationActions = {
  async goto({ page, step, context }) {
    const { url, waitUntil = 'networkidle2', timeout = 30000, referrer } = step;
    const response = await page.goto(url, { waitUntil, timeout, referrer });
    const title = await page.title().catch(() => null);
    const currentUrl = page.url();

    context.set('lastUrl', currentUrl);
    context.set('lastTitle', title);

    return {
      action: 'goto',
      url: currentUrl,
      title,
      status: response?.status?.() ?? null,
      ok: response?.ok?.() ?? null
    };
  },

  async goBack({ page, step, context }) {
    const { waitUntil = 'networkidle2', timeout = 30000 } = step;
    const response = await page.goBack({ waitUntil, timeout });
    const currentUrl = page.url();
    context.set('lastUrl', currentUrl);
    return { action: 'goBack', url: currentUrl, status: response?.status?.() ?? null };
  },

  async goForward({ page, step, context }) {
    const { waitUntil = 'networkidle2', timeout = 30000 } = step;
    const response = await page.goForward({ waitUntil, timeout });
    const currentUrl = page.url();
    context.set('lastUrl', currentUrl);
    return { action: 'goForward', url: currentUrl, status: response?.status?.() ?? null };
  },

  async reload({ page, step, context }) {
    const { waitUntil = 'networkidle2', timeout = 30000 } = step;
    const response = await page.reload({ waitUntil, timeout });
    const currentUrl = page.url();
    context.set('lastUrl', currentUrl);
    return { action: 'reload', url: currentUrl, status: response?.status?.() ?? null };
  }
};
