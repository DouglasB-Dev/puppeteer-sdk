module.exports = {
  apps: [
    {
      name: 'puppeteer-sdk',
      script: 'scripts/run-server.js',
      args: '--headless',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PROJECTS_ROOT: 'projects',
        PUPPETEER_HEADLESS: 'true',
        PUPPETEER_BROWSER_CHANNEL: 'chrome',
        PUPPETEER_BROWSER_MODE: 'keep-open',
        PUPPETEER_PERSIST_SESSION: 'false',
        PUPPETEER_USER_DATA_DIR: 'storage/chrome-profile'
      }
    }
  ]
};
