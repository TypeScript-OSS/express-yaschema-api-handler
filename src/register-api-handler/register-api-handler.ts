import type { AnyBody, AnyHeaders, AnyParams, AnyQuery, AnyStatus, Api, GenericApi } from 'yaschema-api';
import { findAllApisInRoot } from 'yaschema-api';

import type { Logger } from '../config/logging';
import { getLogger } from '../config/logging';

let globalPendingApiRegistrations: Record<string, { humanReadableKey: string; finalizer: () => void }> = {};
const globalRegisteredApis = new Set<GenericApi>();

export const detectMissingApiHandlers = ({
  apiRoots,
  logLevel,
  ignoreMissingApisForRouteTypes,
  ignoreMissingApis
}: {
  apiRoots: any[];
  logLevel: keyof Logger;
  ignoreMissingApisForRouteTypes: string[];
  ignoreMissingApis: GenericApi[];
}) => {
  const ignoreMissingApisForRouteTypesSet = new Set(ignoreMissingApisForRouteTypes);
  const ignoreMissingApisSet = new Set(ignoreMissingApis);

  for (const apiRoot of apiRoots) {
    const apis = findAllApisInRoot(apiRoot);
    for (const api of apis) {
      if (!globalRegisteredApis.has(api)) {
        if (ignoreMissingApisForRouteTypesSet.has(api.routeType)) {
          continue;
        } else if (ignoreMissingApisSet.has(api)) {
          continue;
        }

        getLogger()[logLevel]?.(`API handler missing for`, api);
      }
    }
  }
};

/** Call once all APIs are registered, using `registerApiHandler` or `registerHttpApiHandler` for example, to reorder the registrations and
 * finalize registration with Express */
export const finalizeApiHandlerRegistrations = ({
  detectMissingApiHandlersInApiRoots = [],
  missingApiHandlerLogLevel = 'info',
  ignoreMissingApisForRouteTypes = [],
  ignoreMissingApis = []
}: {
  detectMissingApiHandlersInApiRoots?: any[];
  missingApiHandlerLogLevel?: keyof Logger;
  ignoreMissingApisForRouteTypes?: string[];
  ignoreMissingApis?: GenericApi[];
} = {}) => {
  const pendingApiRegistrations = globalPendingApiRegistrations;
  globalPendingApiRegistrations = {};

  const keys = Object.keys(pendingApiRegistrations).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    getLogger().info?.(`Registering API handler for ${pendingApiRegistrations[key].humanReadableKey}`);
    pendingApiRegistrations[key].finalizer();
  }

  if (detectMissingApiHandlersInApiRoots.length > 0) {
    detectMissingApiHandlers({
      apiRoots: detectMissingApiHandlersInApiRoots,
      logLevel: missingApiHandlerLogLevel,
      ignoreMissingApisForRouteTypes,
      ignoreMissingApis
    });
  }
};

export const registerApiHandler = <
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
  api: Api<ReqHeadersT, ReqParamsT, ReqQueryT, ReqBodyT, ResStatusT, ResHeadersT, ResBodyT, ErrResStatusT, ErrResHeadersT, ErrResBodyT>,
  protocol: string,
  methodName: string | undefined,
  relativeUrl: string,
  finalizer: () => void
) => {
  // Keeping track of which APIs were registered in case we perform detectMissingApiHandlers later
  globalRegisteredApis.add(api as any as GenericApi);

  // We want:
  // - HTTP to be the lowest-priority protocol
  // - Longer matches to be processed before shorter ones
  // - Literal matches to be processed before patterns
  globalPendingApiRegistrations[`${protocol.replace(/^http$/g, '!!!!')}~${methodName ?? '!!!!'}~${relativeUrl.replace(/[{}]/g, '!')}`] = {
    humanReadableKey: `${api.routeType}:${methodName ?? ''}${(methodName?.length ?? 0) > 0 ? ' ' : ''}${protocol}://${relativeUrl}`,
    finalizer
  };
};
