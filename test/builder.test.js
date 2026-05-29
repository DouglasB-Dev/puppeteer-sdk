import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionBuilder } from '../src/lib/action-builder.js';

test('createActionBuilder crea un flujo encadenable', () => {
  const steps = createActionBuilder()
    .goto('https://example.com')
    .extractText('h1', 'title')
    .validateUrl('/dashboard')
    .build();

  assert.equal(steps.length, 3);
  assert.equal(steps[0].type, 'goto');
  assert.equal(steps[1].saveAs, 'title');
  assert.equal(steps[2].expectedContains, '/dashboard');
});
