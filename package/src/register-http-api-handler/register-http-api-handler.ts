import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ValidationMode } from 'yaschema';
import { schema } from 'yaschema';
import type {
  AnyBody,
  AnyHeaders,
  AnyParams,
  AnyQuery,
  AnyStatus,
  GenericHttpApi,
  HttpApi,
  HttpMethod,
  OptionalIfPossiblyUndefined,
  ResponseSchemas
} from 'yaschema-api';
import { checkRequestValidation, checkResponseValidation } from 'yaschema-api';

import { getHttpApiHandlerWrapper } from '../config/http-api-handler-wrapper';
import { triggerOnRequestValidationErrorHandler } from '../config/on-request-validation-error';
import { triggerOnResponseValidationErrorHandler } from '../config/on-response-validation-error';
import { getDefaultRequestValidationMode, getDefaultResponseValidationMode } from '../config/validation-mode';
import { getUrlPathnameUsingRouteType } from '../internal-utils/get-url-pathname';

const anyStringSerializableTypeSchema = schema.oneOf3(
  schema.number().setAllowedSerializationForms(['number', 'string']),
  schema.boolean().setAllowedSerializationForms(['boolean', 'string']),
  schema.string()
);

const anyReqHeadersSchema = schema.record(schema.string(), anyStringSerializableTypeSchema).optional();
const anyReqParamsSchema = schema.record(schema.string(), anyStringSerializableTypeSchema).optional();
const anyReqQuerySchema = schema
  .record(schema.string(), schema.oneOf(anyStringSerializableTypeSchema, schema.array({ items: anyStringSerializableTypeSchema })))
  .optional();
const anyReqBodySchema = schema.any().allowNull().optional();

const anyResStatusSchema = schema.number();
const anyResHeadersSchema = schema.record(schema.string(), anyStringSerializableTypeSchema).optional();
const anyResBodySchema = schema.any().allowNull().optional();

export interface HttpApiHandlerOptions {
  requestValidationMode?: ValidationMode;
  responseValidationMode?: ValidationMode;
  middlewares?: Array<RequestHandler>;
}

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
  handler: (args: {
    express: {
      req: Request;
      res: Response;
      next: NextFunction;
    };
    input: {
      headers: ReqHeadersT;
      params: ReqParamsT;
      query: ReqQueryT;
      body: ReqBodyT;
    };
    output: {
      success: (
        status: ResStatusT,
        value: OptionalIfPossiblyUndefined<'headers', ResHeadersT> & OptionalIfPossiblyUndefined<'body', ResBodyT>
      ) => void;
      failure: (
        status: ErrResStatusT,
        value: OptionalIfPossiblyUndefined<'headers', ErrResHeadersT> & OptionalIfPossiblyUndefined<'body', ErrResBodyT>
      ) => void;
    };
  }) => Promise<void>
) => {
  const expressHandler = async (req: Request, res: Response, next: NextFunction) => {
    const express = { req, res, next };

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
          validationError: checkedRequestValidation.validationError
        });
      }
      if (!checkedRequestValidation.ok) {
        return res.status(StatusCodes.BAD_REQUEST).send('Request header validation error');
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
              validationError: checkedResponseValidation.validationError
            });
          }
          if (!checkedResponseValidation.ok) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
          }
        }

        res.setHeader('Content-Type', 'application/json');

        const cachePolicy = api.cachePolicy ?? { canCache: false };
        if (cachePolicy !== 'dynamic' && cachePolicy.canCache !== false) {
          const cacheIntervalSec = Math.floor(cachePolicy.cacheIntervalSec);
          res.setHeader(
            'Cache-Control',
            `${cachePolicy.canCache === 'public' ? 'public' : 'private'}, ${
              cachePolicy.mustRevalidate ? 'must-revalidate' : 'immutable'
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

        return res.status(status).send(JSON.stringify(resBody.serialized));
      };

    const output = {
      success: makeOutputHandler(api.schemas.successResponse),
      failure: makeOutputHandler(api.schemas.failureResponse ?? {})
    };

    return await handler({ express, input, output });
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
  registerHandlerSoon(methodName, relativizedUrl, () => {
    app[methodName](convertYaschemaParamSyntaxForExpress(relativizedUrl), ...handlers);
  });
};

// Helpers

type UnsupportedHttpMethod = 'LINK' | 'UNLINK';
const unsupportedHttpMethods = new Set<HttpMethod>(['LINK', 'UNLINK']);

type ExpressHandlerMethodName = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

const expressHandlersByHttpMethod: Record<Exclude<HttpMethod, UnsupportedHttpMethod>, ExpressHandlerMethodName> = {
  DELETE: 'delete',
  GET: 'get',
  HEAD: 'head',
  PATCH: 'patch',
  POST: 'post',
  PUT: 'put'
};

/** Converts from api-lib / use syntax like `{name}` to method routing syntax like `:name` */
const convertYaschemaParamSyntaxForExpress = (relativeUrl: string) => relativeUrl.replace(/\{([^}]+)\}/g, ':$1');

const isUnsupportedHttpMethod = (method: HttpMethod): method is UnsupportedHttpMethod => unsupportedHttpMethods.has(method);

type ExpressYaschemaDelayedApiRegistrationFunc = (protocol: string, methodName: string, relativeUrl: string, adder: () => void) => void;
const registerHandlerSoon = (methodName: ExpressHandlerMethodName, url: string, adder: () => void) =>
  expressYaschemaDelayedApiRegistration('http', methodName, url, adder);

// Note: this same code is also included in other packages, like express-yaschema-ws-api-handler, so those registrations can be consistently
// ordered as well
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
let globalPendingApiRegistrationTimeout: ReturnType<typeof setTimeout> | undefined;
const globalPendingApiRegistrations: Record<string, { humanReadableKey: string; adder: () => void }> = {};

const finalizeRegistration = () => {
  const keys = Object.keys(globalPendingApiRegistrations).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    console.info(`Registering handler for ${globalPendingApiRegistrations[key].humanReadableKey}`);
    globalPendingApiRegistrations[key].adder();
    delete globalPendingApiRegistrations[key];
  }
};

(global as any).expressYaschemaDelayedApiRegistration =
  (global as any).expressYaschemaDelayedApiRegistration ??
  (((protocol: string, methodName: string, relativeUrl: string, adder: () => void) => {
    if (globalPendingApiRegistrationTimeout !== undefined) {
      clearTimeout(globalPendingApiRegistrationTimeout);
      globalPendingApiRegistrationTimeout = undefined;
    }

    // We want:
    // - HTTP to be the lowest-priority protocol
    // - Longer matches to be processed before shorter ones
    // - Literal matches to be processed before patterns
    globalPendingApiRegistrations[`${protocol.replace(/^http$/g, '!!!!')}~${methodName}~${relativeUrl.replace(/[{}]/g, '!')}`] = {
      humanReadableKey: `${methodName} ${protocol}://${relativeUrl}`,
      adder
    };

    globalPendingApiRegistrationTimeout = setTimeout(finalizeRegistration, 0);
  }) satisfies ExpressYaschemaDelayedApiRegistrationFunc);

const expressYaschemaDelayedApiRegistration = (global as any)
  .expressYaschemaDelayedApiRegistration as ExpressYaschemaDelayedApiRegistrationFunc;
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
