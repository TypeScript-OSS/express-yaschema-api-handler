import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type {
  AnyBody,
  AnyHeaders,
  AnyParams,
  AnyQuery,
  AnyStatus,
  GenericHttpApi,
  HttpApi,
  OptionalIfPossiblyUndefined,
  ResponseSchemas
} from 'yaschema-api';
import {
  anyReqBodySchema,
  anyReqHeadersSchema,
  anyReqParamsSchema,
  anyReqQuerySchema,
  anyResBodySchema,
  anyResHeadersSchema,
  anyResStatusSchema,
  checkRequestValidation,
  checkResponseValidation
} from 'yaschema-api';

import { getHttpApiHandlerWrapper } from '../config/http-api-handler-wrapper.js';
import { triggerOnRequestValidationErrorHandler } from '../config/on-request-validation-error.js';
import { triggerOnResponseValidationErrorHandler } from '../config/on-response-validation-error.js';
import { getDefaultRequestValidationMode, getDefaultResponseValidationMode } from '../config/validation-mode.js';
import { expressHandlersByHttpMethod } from '../internal-consts/express-handlers-by-http-method.js';
import { convertYaschemaParamSyntaxForExpress } from '../internal-utils/convert-yaschema-param-syntax-for-express.js';
import { getUrlPathnameUsingRouteType } from '../internal-utils/get-url-pathname.js';
import { isUnsupportedHttpMethod } from '../internal-utils/is-unsupported-http-method.js';
import { resolveSpecialFormDataFields } from '../internal-utils/resolve-special-form-data-fields.js';
import { registerApiHandler } from '../register-api-handler/register-api-handler.js';
import type { HttpApiHandler } from '../types/HttpApiHandler';
import type { HttpApiHandlerOptions } from '../types/HttpApiHandlerOptions';

/** Be sure to call `finalizeApiHandlerRegistrations` once all API registrations have been added. */
export const registerHttpApiHandler = <
  ReqHeadersT extends AnyHeaders,
  ReqParamsT extends AnyParams,
  ReqQueryT extends AnyQuery,
  ReqBodyT extends AnyBody,
  ResStatusT extends AnyStatus,
  ResHeadersT extends AnyHeaders,
  ResBodyT extends AnyBody,
  ErrResStatusT extends AnyStatus,
  ErrResHeadersT extends AnyHeaders,
  ErrResBodyT extends AnyBody
>(
  app: Express,
  api: HttpApi<ReqHeadersT, ReqParamsT, ReqQueryT, ReqBodyT, ResStatusT, ResHeadersT, ResBodyT, ErrResStatusT, ErrResHeadersT, ErrResBodyT>,
  {
    requestValidationMode = getDefaultRequestValidationMode(),
    responseValidationMode = getDefaultResponseValidationMode(),
    middlewares = []
  }: HttpApiHandlerOptions,
  handler: HttpApiHandler<
    ReqHeadersT,
    ReqParamsT,
    ReqQueryT,
    ReqBodyT,
    ResStatusT,
    ResHeadersT,
    ResBodyT,
    ErrResStatusT,
    ErrResHeadersT,
    ErrResBodyT
  >
) => {
  const expressHandler = async (req: Request, res: Response, next: NextFunction) => {
    const express = { req, res, next };

    // Form data supports JSON-encoded fields for objects and nested arrays where the JSON fields are prefixed with "yaschema/json:".
    if (api.requestType === 'form-data') {
      // In-place substitution of prefixed JSON strings with their resolved values
      resolveSpecialFormDataFields(req.body);
    }

    const [reqHeaders, reqParams, reqQuery, reqBody] = await Promise.all([
      (api.schemas.request.headers ?? anyReqHeadersSchema).deserializeAsync(req.headers, { validation: requestValidationMode }),
      (api.schemas.request.params ?? anyReqParamsSchema).deserializeAsync(req.params, { validation: requestValidationMode }),
      (api.schemas.request.query ?? anyReqQuerySchema).deserializeAsync(req.query, { validation: requestValidationMode }),
      (api.schemas.request.body ?? anyReqBodySchema).deserializeAsync(req.body, { validation: requestValidationMode })
    ]);

    if (requestValidationMode !== 'none') {
      const checkedRequestValidation = checkRequestValidation({
        reqHeaders,
        reqParams,
        reqQuery,
        reqBody,
        validationMode: requestValidationMode
      });
      if (!checkedRequestValidation.ok || checkedRequestValidation.hadSoftValidationError) {
        triggerOnRequestValidationErrorHandler({
          api: api as any as GenericHttpApi,
          req: {
            headers: reqHeaders.deserialized as ReqHeadersT,
            params: reqParams.deserialized as ReqParamsT,
            query: reqQuery.deserialized as ReqQueryT,
            body: reqBody.deserialized as ReqBodyT
          },
          expressReq: express.req,
          invalidPart: checkedRequestValidation.invalidPart,
          validationError: checkedRequestValidation.validationError,
          validationErrorPath: checkedRequestValidation.validationErrorPath
        });
      }
      if (!checkedRequestValidation.ok) {
        res.status(StatusCodes.BAD_REQUEST).send(`Request ${checkedRequestValidation.invalidPart} validation error`);
        return;
      }
    }

    const input = {
      headers: reqHeaders.deserialized as ReqHeadersT,
      params: reqParams.deserialized as ReqParamsT,
      query: reqQuery.deserialized as ReqQueryT,
      body: reqBody.deserialized as ReqBodyT
    };

    let alreadyOutput = false;

    const makeOutputHandler =
      <ResStatusT extends AnyStatus, ResHeadersT extends AnyHeaders, ResBodyT extends AnyBody>(
        schemas: ResponseSchemas<ResStatusT, ResHeadersT, ResBodyT>
      ) =>
      async (
        status: ResStatusT,
        { headers, body }: OptionalIfPossiblyUndefined<'headers', ResHeadersT> & OptionalIfPossiblyUndefined<'body', ResBodyT>
      ) => {
        if (alreadyOutput) {
          console.warn('Multiple outputs attempted for', req.url);
          return;
        }
        alreadyOutput = true;

        const [resStatus, resHeaders, resBody] = await Promise.all([
          (schemas.status ?? anyResStatusSchema).serializeAsync(status, { validation: responseValidationMode }),
          (schemas.headers ?? anyResHeadersSchema).serializeAsync((headers ?? {}) as ResHeadersT, {
            validation: responseValidationMode
          }),
          (schemas.body ?? anyResBodySchema).serializeAsync(body as ResBodyT, { validation: responseValidationMode })
        ]);

        if (responseValidationMode !== 'none') {
          const checkedResponseValidation = checkResponseValidation({
            resStatus,
            resHeaders,
            resBody,
            validationMode: responseValidationMode
          });
          if (!checkedResponseValidation.ok || checkedResponseValidation.hadSoftValidationError) {
            triggerOnResponseValidationErrorHandler({
              api: api as any as GenericHttpApi,
              req: {
                headers: reqHeaders.deserialized as ReqHeadersT,
                params: reqParams.deserialized as ReqParamsT,
                query: reqQuery.deserialized as ReqQueryT,
                body: reqBody.deserialized as ReqBodyT
              },
              expressReq: express.req,
              res: { status, headers, body },
              invalidPart: checkedResponseValidation.invalidPart,
              validationError: checkedResponseValidation.validationError,
              validationErrorPath: checkedResponseValidation.validationErrorPath
            });
          }
          if (!checkedResponseValidation.ok) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            return;
          }
        }

        res.setHeader('Content-Type', 'application/json');

        const cachePolicy = api.cachePolicy ?? { canCache: false };
        if (cachePolicy !== 'dynamic' && cachePolicy.canCache !== false) {
          const cacheIntervalSec = Math.floor(cachePolicy.cacheIntervalSec);
          res.setHeader(
            'Cache-Control',
            `${cachePolicy.canCache === 'public' ? 'public' : 'private'}, ${
              (cachePolicy.mustRevalidate ?? false) ? 'must-revalidate' : 'immutable'
            }, max-age=${cacheIntervalSec}, min-fresh=${cacheIntervalSec}`
          );
        }

        const serializedResHeaders = resHeaders.serialized as AnyHeaders;
        for (const key of Object.keys(serializedResHeaders ?? {})) {
          const headerValue = serializedResHeaders![key];
          if (headerValue !== undefined) {
            res.setHeader(key, String(headerValue));
          }
        }

        res.status(status).send(JSON.stringify(resBody.serialized));
        return;
      };

    const output = {
      success: makeOutputHandler(api.schemas.successResponse),
      failure: makeOutputHandler(api.schemas.failureResponse ?? {})
    };

    handler({ express, input, output, extras: {} });
  };

  if (isUnsupportedHttpMethod(api.method)) {
    throw new Error(`Unsupported HTTP method (${api.method}) encountered for ${api.url}`);
  }

  // Note: this strips any host-related info and doesn't check whether this server is the "right" server to handle these requests
  const relativizedUrl = getUrlPathnameUsingRouteType(api.routeType, api.url);

  const methodName = expressHandlersByHttpMethod[api.method];
  const asyncHandlerWrapper = getHttpApiHandlerWrapper();
  const handlers: RequestHandler[] = [...middlewares, asyncHandlerWrapper(expressHandler)];

  // Delaying the actual registration with Express slightly so we can re-order the registrations to be handled in the correct order (e.g.
  // longer exact matches first)
  registerApiHandler(api, 'http', methodName, relativizedUrl, () => {
    app[methodName](convertYaschemaParamSyntaxForExpress(relativizedUrl), ...handlers);
  });
};
