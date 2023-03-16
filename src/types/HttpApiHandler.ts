import type { AnyBody, AnyHeaders, AnyParams, AnyQuery, AnyStatus } from 'yaschema-api';

import type { HttpApiHandlerArgs } from './HttpApiHandlerArgs';

export type HttpApiHandler<
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
> = (
  args: HttpApiHandlerArgs<
    ReqHeadersT,
    ReqParamsT,
    ReqQueryT,
    ReqBodyT,
    ResStatusT,
    ResHeadersT,
    ResBodyT,
    ErrResStatusT,
    ErrResHeadersT,
    ErrResBodyT,
    ExtraArgsT
  >
) => Promise<void>;
