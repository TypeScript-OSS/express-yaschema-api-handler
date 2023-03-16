import type { Request } from 'express';
import type { GenericApiRequest, GenericApiResponse, GenericHttpApi } from 'yaschema-api';

interface OnResponseValidationErrorHandlerArgs {
  api: GenericHttpApi;
  req: GenericApiRequest;
  expressReq: Request;
  /** This will be undefined in cases where we didn't get to deserialize the response */
  res: GenericApiResponse | undefined;
  invalidPart: keyof GenericApiResponse;
  validationError: string;
}

let globalOnResponseValidationErrorHandler: (args: OnResponseValidationErrorHandlerArgs) => void = () => {};

/** Gets the configured function that will be called whenever a response validation error occurs */
export const getOnResponseValidationErrorHandler = () => globalOnResponseValidationErrorHandler;

/** Sets the configured function that will be called whenever a response validation error occurs */
export const setOnResponseValidationErrorHandler = (handler: (args: OnResponseValidationErrorHandlerArgs) => void) => {
  globalOnResponseValidationErrorHandler = handler;
};

/** Triggers the configured function that will be called whenever a response validation error occurs */
export const triggerOnResponseValidationErrorHandler = (args: OnResponseValidationErrorHandlerArgs) => {
  globalOnResponseValidationErrorHandler(args);
};
