import type { ValidationMode } from 'yaschema';

let globalDefaultRequestValidation: ValidationMode = 'hard';
let globalDefaultResponseValidation: ValidationMode = 'hard';

/** Gets the default validation mode for requests */
export const getDefaultRequestValidationMode = () => globalDefaultRequestValidation;

/** Sets the default validation mode for requests */
export const setDefaultRequestValidationMode = (mode: ValidationMode) => {
  globalDefaultRequestValidation = mode;
};

/** Gets the default validation mode for responses */
export const getDefaultResponseValidationMode = () => globalDefaultResponseValidation;

/** Sets the default validation mode for responses */
export const setDefaultResponseValidationMode = (mode: ValidationMode) => {
  globalDefaultResponseValidation = mode;
};
