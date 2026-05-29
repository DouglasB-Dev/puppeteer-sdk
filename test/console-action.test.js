import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionHandler } from '../src/lib/action-handler.js';

test('consoleLog registra mensajes interpolados en el contexto', async () => {
  const handler = createActionHandler();

  const result = await handler.executeSteps(null, [
    { type: 'consoleLog', level: 'info', message: 'Hola ${name}' }
  ], {
    verbose: false,
    variables: {
      name: 'SDK'
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.context.console.length, 1);
  assert.equal(result.context.console[0].message, 'Hola SDK');
});
