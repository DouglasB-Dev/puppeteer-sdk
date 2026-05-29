import { createActionBuilder } from '../lib/action-builder.js';
import { env } from '../config/env.js';

export const createValidatePageIntegrityFlow = ({ baseUrl = env.baseUrl, path = '/' } = {}) => {
  return createActionBuilder()
    .goto(`${baseUrl}${path}`)
    .validateUrl(baseUrl)
    .validateSelector('header', true, { continueOnError: true })
    .validateSelector('main', true, { continueOnError: true })
    .validateSelector('footer', true, { continueOnError: true })
    .validateSelector('.error-message', false, { continueOnError: true })
    .extractHTML('body', 'pageHTML')
    .build();
};

export const createValidateAfterLoginFlow = ({ expectedUser } = {}) => {
  return createActionBuilder()
    .validateUrl('/dashboard')
    .validateSelector('.user-menu', true)
    .validateText('.user-name', expectedUser)
    .validateCondition("document.querySelector('.logout-button') !== null", { saveAs: 'hasLogoutButton' })
    .build();
};

export const createValidateCheckoutProcessFlow = ({ baseUrl = env.baseUrl } = {}) => {
  return createActionBuilder()
    .goto(`${baseUrl}/carrito`)
    .validateSelector('.cart-items', true)
    .validateSelector('.cart-total', true)
    .click('.checkout-button', { waitForNavigation: true })
    .validateUrl('/checkout')
    .validateSelector('#shipping-form', true)
    .validateSelector('#payment-form', true)
    .build();
};

export const createValidateSearchResultsFlow = ({ searchTerm } = {}) => {
  return createActionBuilder()
    .validateUrl(encodeURIComponent(searchTerm))
    .validateSelector('.results-count', true)
    .validateSelector('.no-results', false, { continueOnError: true })
    .extractText('.results-count', 'resultCount')
    .validateCondition(
      "(() => { const results = document.querySelectorAll('.result-item'); if (results.length === 0) return true; const title = results[0].querySelector('.title')?.textContent || ''; return title.toLowerCase().includes(args[0].toLowerCase()); })()",
      { args: [searchTerm], saveAs: 'searchRelevance' }
    )
    .build();
};

export const validationFlows = {
  pageIntegrity: createValidatePageIntegrityFlow,
  afterLogin: createValidateAfterLoginFlow,
  checkout: createValidateCheckoutProcessFlow,
  searchResults: createValidateSearchResultsFlow
};
