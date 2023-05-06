import type { HttpMethod } from 'yaschema-api';

export type UnsupportedHttpMethod = 'LINK' | 'UNLINK';
export const unsupportedHttpMethods = new Set<HttpMethod>(['LINK', 'UNLINK']);

export type ExpressHandlerMethodName = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

export const expressHandlersByHttpMethod: Record<Exclude<HttpMethod, UnsupportedHttpMethod>, ExpressHandlerMethodName> = {
  DELETE: 'delete',
  GET: 'get',
  HEAD: 'head',
  PATCH: 'patch',
  POST: 'post',
  PUT: 'put'
};
