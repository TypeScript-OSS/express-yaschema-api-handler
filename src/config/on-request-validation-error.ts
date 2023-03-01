import type { Request } from 'express';
import type { GenericApiRequest, GenericHttpApi } from 'yaschema-api';

interface OnRequestValidationErrorHandlerArgs {
  api: GenericHttpApi;
  /** This will be undefined in cases where we didn't get to deserialize the request */
  req: GenericApiRequest | undefined;
  expressReq: Request;
  invalidPart: keyof GenericApiRequest;
  validationError: string;
}

let globalOnRequestValidationErrorHandler: (args: OnRequestValidationErrorHandlerArgs) => void = () => {};

/** Gets the configured function that will be called whenever a request validation error occurs */
export const getOnRequestValidationErrorHandler = () => globalOnRequestValidationErrorHandler;

/** Sets the configured function that will be called whenever a request validation error occurs */
export const setOnRequestValidationErrorHandler = (handler: (args: OnRequestValidationErrorHandlerArgs) => void) => {
  globalOnRequestValidationErrorHandler = handler;
};

/** Triggers the configured function that will be called whenever a request validation error occurs */
export const triggerOnRequestValidationErrorHandler = (args: OnRequestValidationErrorHandlerArgs) => {
  globalOnRequestValidationErrorHandler(args);
};
