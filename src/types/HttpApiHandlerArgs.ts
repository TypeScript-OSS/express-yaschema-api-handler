import type { NextFunction, Request, Response } from 'express';
import type { AnyBody, AnyHeaders, AnyParams, AnyQuery, AnyStatus, OptionalIfPossiblyUndefined } from 'yaschema-api';

export interface HttpApiHandlerArgs<
  ReqHeadersT extends AnyHeaders,
  ReqParamsT extends AnyParams,
  ReqQueryT extends AnyQuery,
  ReqBodyT extends AnyBody,
  ResStatusT extends AnyStatus,
  ResHeadersT extends AnyHeaders,
  ResBodyT extends AnyBody,
  ErrResStatusT extends AnyStatus,
  ErrResHeadersT extends AnyHeaders,
  ErrResBodyT extends AnyBody,
  ExtraArgsT extends Record<string, any> = Record<string, never>
> {
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
  extras: ExtraArgsT;
}
