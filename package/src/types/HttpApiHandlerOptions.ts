import type { RequestHandler } from 'express';
import type { ValidationMode } from 'yaschema';

export interface HttpApiHandlerOptions {
  requestValidationMode?: ValidationMode;
  responseValidationMode?: ValidationMode;
  middlewares?: Array<RequestHandler>;
}
