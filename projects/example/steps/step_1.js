export const googleSearchSteps = ({ query = 'hola' } = {}) => [
  {
    type: 'consoleLog',
    level: 'info',
    message: `Buscando "${query}" en Google`
  },
  {
    type: 'goto',
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=es&num=10`,
    waitUntil: 'domcontentloaded',
    timeout: 45000
  },
  {
    type: 'waitForSelector',
    selector: 'a h3',
    visible: true,
    timeout: 15000
  },
  {
    type: 'extractText',
    selector: 'a h3',
    saveAs: 'firstResultTitle',
    timeout: 15000
  },
  {
    type: 'consoleLog',
    level: 'info',
    message: 'Titulo capturado: ${firstResultTitle}'
  }
];
