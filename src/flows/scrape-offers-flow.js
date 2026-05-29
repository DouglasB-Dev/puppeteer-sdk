import { createActionBuilder } from '../lib/action-builder.js';
import { env } from '../config/env.js';

export const createScrapeProductListFlow = ({ baseUrl = env.baseUrl, path = '/ofertas' } = {}) => {
  return createActionBuilder()
    .goto(`${baseUrl}${path}`)
    .waitForSelector('.product-grid', { visible: true })
    .extractList('.product-item', {
      title: '.product-title',
      price: '.product-price',
      discount: { selector: '.discount-badge', fallback: null },
      link: 'a.product-link@href'
    }, 'products')
    .validateData('products', { minLength: 1, saveAs: 'hasProducts' })
    .build();
};

export const createScrapeProductDetailsFlow = () => {
  return createActionBuilder()
    .extractText('.product-title', 'productTitle')
    .extractText('.product-price', 'productPrice')
    .extractText('.product-description', 'description', { continueOnError: true })
    .extractAttribute('.product-image', 'src', 'imageUrl', { continueOnError: true })
    .extractList('.specifications li', {
      label: 'span:first-child',
      value: 'span:last-child'
    }, 'specifications', { allowEmpty: true })
    .screenshot({ path: 'artifacts/product.png', fullPage: true, saveAs: 'productScreenshot' })
    .build();
};

export const createSearchOffersFlow = ({ baseUrl = env.baseUrl, searchTerm } = {}) => {
  return createActionBuilder()
    .goto(`${baseUrl}/buscar`)
    .type('#search-input', searchTerm)
    .click('#search-button', { waitForNavigation: true })
    .validateUrl(encodeURIComponent(searchTerm))
    .waitForSelector('.results-list')
    .extractList('.result-item', {
      title: '.item-title',
      price: '.item-price',
      url: 'a@href'
    }, 'searchResults', { allowEmpty: true })
    .build();
};

export const createPaginateAndCollectFlow = ({ baseUrl = env.baseUrl, pages = 3 } = {}) => {
  const builder = createActionBuilder()
    .goto(`${baseUrl}/ofertas`)
    .extractList('.product-item', {
      title: '.product-title',
      price: '.product-price',
      url: 'a.product-link@href'
    }, 'page1Products');

  for (let page = 2; page <= pages; page += 1) {
    builder
      .click(`.pagination a[data-page="${page}"]`, { waitForNavigation: true })
      .extractList('.product-item', {
        title: '.product-title',
        price: '.product-price',
        url: 'a.product-link@href'
      }, `page${page}Products`);
  }

  return builder.build();
};

export const scrapeOffersFlows = {
  list: createScrapeProductListFlow,
  details: createScrapeProductDetailsFlow,
  search: createSearchOffersFlow,
  paginate: createPaginateAndCollectFlow
};
