import { navigationActions } from './navigation.js';
import { interactionActions } from './interaction.js';
import { extractionActions } from './extraction.js';
import { validationActions } from './validation.js';
import { waitActions } from './wait.js';
import { variableActions } from './variables.js';
import { flowControlActions } from './flow-control.js';
import { consoleActions } from './console.js';

export const allActions = {
  ...navigationActions,
  ...interactionActions,
  ...extractionActions,
  ...validationActions,
  ...waitActions,
  ...variableActions,
  ...flowControlActions,
  ...consoleActions
};
