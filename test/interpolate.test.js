import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../src/lib/context.js';
import { interpolateValue } from '../src/lib/utils/interpolate.js';

test('interpolateValue reemplaza variables y conserva objetos cuando el token es exacto', () => {
  const context = createContext({ variables: { baseUrl: 'https://example.com', user: { id: 7 } } });
  context.set('title', 'Example');

  assert.equal(interpolateValue('${baseUrl}/login', context), 'https://example.com/login');
  assert.equal(interpolateValue('Titulo: ${title}', context), 'Titulo: Example');
  assert.deepEqual(interpolateValue('${variables.user}', context), { id: 7 });
});
