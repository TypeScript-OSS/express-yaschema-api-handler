import type { Api } from 'yaschema-api';
import { findAllApisInRoot } from 'yaschema-api';

import type { Logger } from '../config/logging';
import { getLogger } from '../config/logging';

let globalPendingApiRegistrations: Record<string, { api: Api; finalizer: () => void }> = {};
const globalRegisteredApis = new Set<Api>();

export const detectMissingApiHandlers = ({
  apiRoots,
  logLevel,
  ignoreMissingApisForRouteTypes,
  ignoreMissingApis
}: {
  apiRoots: any[];
  logLevel: keyof Logger;
  ignoreMissingApisForRouteTypes: string[];
  ignoreMissingApis: Api[];
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
  ignoreMissingApis?: Api[];
} = {}) => {
  const pendingApiRegistrations = globalPendingApiRegistrations;
  globalPendingApiRegistrations = {};

  const keys = Object.keys(pendingApiRegistrations).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    getLogger().info?.(`Registering API handler for ${pendingApiRegistrations[key].api.name}`);
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

export const registerApiHandler = (
  api: Api,
  protocol: string,
  methodName: string | undefined,
  relativeUrl: string,
  finalizer: () => void
) => {
  // Keeping track of which APIs were registered in case we perform detectMissingApiHandlers later
  globalRegisteredApis.add(api);

  // We want:
  // - HTTP to be the lowest-priority protocol
  // - Longer matches to be processed before shorter ones
  // - Literal matches to be processed before patterns
  globalPendingApiRegistrations[`${protocol.replace(/^http$/g, '!!!!')}~${methodName ?? '!!!!'}~${relativeUrl.replace(/[{}]/g, '!')}`] = {
    api,
    finalizer
  };
};
