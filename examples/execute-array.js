import { createActionHandler } from '../src/lib/action-handler.js';
import { createBrowserManager } from '../src/lib/browser-manager.js';

const steps = [
  { type: 'goto', url: 'https://example.com' },
  { type: 'extractText', selector: 'h1', saveAs: 'title' },
  { type: 'validateText', selector: 'h1', containsText: 'Example' },
  { type: 'extractList', selector: 'a', fields: { text: 'text()', url: '@href' }, saveAs: 'links', allowEmpty: true },
  { type: 'screenshot', path: 'artifacts/example-home.png', fullPage: true, saveAs: 'homeScreenshot' }
];

const browserManager = createBrowserManager();
const handler = createActionHandler();
const page = await browserManager.newPage();

try {
  const result = await handler.executeSteps(page, steps, { verbose: true });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await page.close().catch(() => null);
  await browserManager.close();
}
