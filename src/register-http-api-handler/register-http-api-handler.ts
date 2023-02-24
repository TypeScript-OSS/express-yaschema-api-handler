import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { SingleOrArray, ValidationMode } from 'yaschema';
import { schema } from 'yaschema';
import type { AnyStringSerializableType, HttpApi, HttpMethod, ResponseSchemas } from 'yaschema-api';

import { getAsyncHandlerWrapper } from '../config/async-handler-wrapper';
import { getDefaultRequestValidationMode, getDefaultResponseValidationMode } from '../config/validation-mode';
import { getUrlPathnameUsingRouteType } from '../internal-utils/get-url-pathname';

const anyStringSerializableTypeSchema = schema.oneOf3(schema.string(), schema.number(), schema.boolean());

const anyReqHeadersSchema = schema.record(schema.string(), anyStringSerializableTypeSchema);
const anyReqParamsSchema = schema.record(schema.string(), anyStringSerializableTypeSchema);
const anyReqQuerySchema = schema.record(
  schema.string(),
  schema.oneOf(anyStringSerializableTypeSchema, schema.array({ items: anyStringSerializableTypeSchema }))
);
const anyReqBodySchema = schema.any();

const anyResStatusSchema = schema.number();
const anyResHeadersSchema = schema.record(schema.string(), anyStringSerializableTypeSchema);
const anyResBodySchema = schema.any();

export interface HttpApiHandlerOptions {
  requestValidationMode?: ValidationMode;
  responseValidationMode?: ValidationMode;
  middlewares?: Array<RequestHandler>;
}

export const registerHttpApiHandler = <
  ReqHeadersT extends Record<string, AnyStringSerializableType>,
  ReqParamsT extends Record<string, AnyStringSerializableType>,
  ReqQueryT extends Record<string, SingleOrArray<AnyStringSerializableType>>,
  ReqBodyT,
  ResStatusT extends number,
  ResHeadersT extends Record<string, AnyStringSerializableType>,
  ResBodyT,
  ErrResStatusT extends number,
  ErrResHeadersT extends Record<string, AnyStringSerializableType>,
  ErrResBodyT
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
      success: (status: ResStatusT, value: { headers: ResHeadersT; body: ResBodyT }) => void;
      failure: (status: ErrResStatusT, value: { headers: ErrResHeadersT; body: ErrResBodyT }) => void;
    };
  }) => Promise<void>
) => {
  const expressHandler = async (req: Request, res: Response, next: NextFunction) => {
    const express = { req, res, next };

    const [reqHeaders, reqParams, reqQuery, reqBody] = await Promise.all([
      await (api.schemas.request.headers ?? anyReqHeadersSchema).deserializeAsync(req.headers, { validation: requestValidationMode }),
      await (api.schemas.request.params ?? anyReqParamsSchema).deserializeAsync(req.params, { validation: requestValidationMode }),
      await (api.schemas.request.query ?? anyReqQuerySchema).deserializeAsync(req.query, { validation: requestValidationMode }),
      await (api.schemas.request.body ?? anyReqBodySchema).deserializeAsync(req.body, { validation: requestValidationMode })
    ]);

    if (requestValidationMode !== 'none') {
      if (reqHeaders?.error !== undefined) {
        if (requestValidationMode === 'hard') {
          return res.status(StatusCodes.BAD_REQUEST).send('Request header validation error');
        } else {
          console.debug(req.url, 'request header validation error', reqHeaders?.error);
        }
      }

      if (reqParams?.error !== undefined) {
        if (requestValidationMode === 'hard') {
          return res.status(StatusCodes.BAD_REQUEST).send('Request param validation error');
        } else {
          console.debug(req.url, 'request param validation error', reqParams?.error);
        }
      }

      if (reqQuery?.error !== undefined) {
        if (requestValidationMode === 'hard') {
          return res.status(StatusCodes.BAD_REQUEST).send('Request query validation error');
        } else {
          console.debug(req.url, 'request query validation error', reqQuery?.error);
        }
      }

      if (reqBody?.error !== undefined) {
        if (requestValidationMode === 'hard') {
          return res.status(StatusCodes.BAD_REQUEST).send('Request body validation error');
        } else {
          console.debug(req.url, 'request body validation error', reqBody?.error);
        }
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
      <ResStatusT extends number, ResHeadersT extends Record<string, AnyStringSerializableType>, ResBodyT>(
        schemas: ResponseSchemas<ResStatusT, ResHeadersT, ResBodyT>
      ) =>
      async (status: ResStatusT, { headers, body }: { headers: ResHeadersT; body: ResBodyT }) => {
        if (alreadyOutput) {
          console.warn('Multiple outputs attempted for', req.url);
          return;
        }
        alreadyOutput = true;

        const [resStatus, resHeaders, resBody] = await Promise.all([
          await (schemas.status ?? anyResStatusSchema).serializeAsync(status, { validation: responseValidationMode }),
          await (schemas.headers ?? anyResHeadersSchema).serializeAsync(headers, {
            validation: responseValidationMode
          }),
          await (schemas.body ?? anyResBodySchema).serializeAsync(body, { validation: responseValidationMode })
        ]);

        if (responseValidationMode !== 'none') {
          if (resStatus?.error !== undefined) {
            if (responseValidationMode === 'hard') {
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            } else {
              console.debug(req.url, 'response status validation error', resStatus?.error);
            }
          }

          if (resHeaders?.error !== undefined) {
            if (responseValidationMode === 'hard') {
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            } else {
              console.debug(req.url, 'response header validation error', resHeaders?.error);
            }
          }

          if (resBody?.error !== undefined) {
            if (responseValidationMode === 'hard') {
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            } else {
              console.debug(req.url, 'response body validation error', resBody?.error);
            }
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

        const serializedResHeaders = (resHeaders.serialized ?? {}) as Record<string, AnyStringSerializableType>;
        for (const key of Object.keys(serializedResHeaders)) {
          const headerValue = serializedResHeaders[key];
          if (headerValue !== undefined) {
            res.setHeader(key, String(headerValue));
          }
        }

        return res.status(status).send(resBody.serialized);
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
  const asyncHandlerWrapper = getAsyncHandlerWrapper();
  const handlers: RequestHandler[] = [...middlewares, asyncHandlerWrapper(expressHandler)];
  app[methodName](relativizedUrl, ...handlers);
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

const isUnsupportedHttpMethod = (method: HttpMethod): method is UnsupportedHttpMethod => unsupportedHttpMethods.has(method);
