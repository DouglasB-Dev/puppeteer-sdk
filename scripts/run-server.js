const useWindow = process.argv.includes('--window');
const forceHeadless = process.argv.includes('--headless');

if (useWindow || forceHeadless || process.env.PUPPETEER_HEADLESS == null) {
  process.env.PUPPETEER_HEADLESS = useWindow ? 'false' : 'true';
}

await import('../src/server.js');
