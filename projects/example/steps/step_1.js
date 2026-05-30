const EXPECTED_INTRO_TEXT = 'Puppeteer is a JavaScript library which provides a high-level API to control Chrome or Firefox over the DevTools Protocol or WebDriver BiDi. Puppeteer runs in the headless (no visible UI) by default';
const INTRO_SELECTOR = 'main p:has(a[href="https://chromedevtools.github.io/devtools-protocol/"])';

export const puppeteerHomeSteps = ({ url = 'https://pptr.dev/' } = {}) => [
  {
    type: 'consoleLog',
    level: 'info',
    message: `Abriendo ${url}`
  },
  {
    type: 'goto',
    url,
    waitUntil: 'domcontentloaded',
    timeout: 45000
  },
  {
    type: 'waitForSelector',
    selector: INTRO_SELECTOR,
    visible: true,
    timeout: 15000
  },
  {
    type: 'validateText',
    selector: INTRO_SELECTOR,
    containsText: EXPECTED_INTRO_TEXT,
    timeout: 15000
  },
  {
    type: 'extractText',
    selector: INTRO_SELECTOR,
    attribute: 'innerText',
    saveAs: 'introText',
    timeout: 15000
  },
  {
    type: 'consoleLog',
    level: 'info',
    message: 'Texto capturado: ${introText}'
  }
];
