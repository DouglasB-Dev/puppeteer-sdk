import { createActionBuilder } from '../lib/action-builder.js';
import { env } from '../config/env.js';

const defaultSelectors = {
  username: '#username',
  password: '#password',
  submit: 'button[type="submit"]',
  userMenu: '.user-menu',
  welcome: '.welcome-message',
  twoFactorCode: '#2fa-code',
  verify: '#verify-button'
};

export const createStandardLoginFlow = ({
  baseUrl = env.baseUrl,
  username,
  password,
  selectors = {},
  dashboardPath = '/dashboard'
} = {}) => {
  const s = { ...defaultSelectors, ...selectors };

  return createActionBuilder()
    .goto(`${baseUrl}/login`)
    .waitForSelector(s.username, { visible: true })
    .type(s.username, username)
    .type(s.password, password)
    .click(s.submit, { waitForNavigation: true })
    .validateUrl(dashboardPath)
    .validateSelector(s.userMenu, true, { saveAs: 'userMenuCheck' })
    .extractText(s.welcome, 'welcomeText', { continueOnError: true })
    .build();
};

export const createLoginWith2FAFlow = ({
  baseUrl = env.baseUrl,
  username,
  password,
  code,
  selectors = {},
  dashboardPath = '/dashboard'
} = {}) => {
  const s = { ...defaultSelectors, ...selectors };

  return createActionBuilder()
    .goto(`${baseUrl}/login`)
    .type(s.username, username)
    .type(s.password, password)
    .click(s.submit, { waitForNavigation: true })
    .waitForSelector(s.twoFactorCode, { visible: true })
    .type(s.twoFactorCode, code ?? '${twoFactorCode}')
    .click(s.verify, { waitForNavigation: true })
    .validateUrl(dashboardPath)
    .validateSelector(s.userMenu, true)
    .build();
};

export const createCheckSessionFlow = ({ baseUrl = env.baseUrl, selectors = {} } = {}) => {
  const s = { ...defaultSelectors, ...selectors };

  return createActionBuilder()
    .goto(`${baseUrl}/dashboard`)
    .validateSelector(s.userMenu, true, { saveAs: 'sessionValid', critical: true })
    .extractText('.user-name', 'currentUser', { continueOnError: true })
    .build();
};

export const loginFlows = {
  standardLogin: createStandardLoginFlow,
  loginWith2FA: createLoginWith2FAFlow,
  checkSession: createCheckSessionFlow
};
