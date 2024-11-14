import type { Api } from 'yaschema-api';
import { findAllApisInRoot } from 'yaschema-api';

import type { Logger } from '../config/logging';
import { getLogger } from '../config/logging.js';
import { makeYaschemaApiExpressContext, type YaschemaApiExpressContext } from '../types/YaschemaApiExpressContext.js';

const globalDefaultExpressContext = makeYaschemaApiExpressContext();

export const detectMissingApiHandlers = ({
  apiRoots,
  logLevel,
  ignoreMissingApisForRouteTypes,
  ignoreMissingApis,
  context = globalDefaultExpressContext
}: {
  apiRoots: any[];
  logLevel: keyof Logger;
  ignoreMissingApisForRouteTypes: string[];
  ignoreMissingApis: Api[];
  context?: YaschemaApiExpressContext;
}) => {
  const ignoreMissingApisForRouteTypesSet = new Set(ignoreMissingApisForRouteTypes);
  const ignoreMissingApisSet = new Set(ignoreMissingApis);

  for (const apiRoot of apiRoots) {
    const apis = findAllApisInRoot(apiRoot);
    for (const api of apis) {
      if (!context.registeredYaschemaApis.has(api)) {
        if (ignoreMissingApisForRouteTypesSet.has(api.routeType)) {
          continue;
        } else if (ignoreMissingApisSet.has(api)) {
          continue;
        }

        getLogger()[logLevel]?.(`API handler missing for`, api.name);
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
  ignoreMissingApis = [],
  context = globalDefaultExpressContext
}: {
  detectMissingApiHandlersInApiRoots?: any[];
  missingApiHandlerLogLevel?: keyof Logger;
  ignoreMissingApisForRouteTypes?: string[];
  ignoreMissingApis?: Api[];
  context?: YaschemaApiExpressContext;
} = {}) => {
  const pendingApiRegistrations = context.pendingYaschemaApiRegistrations;
  context.pendingYaschemaApiRegistrations = {};

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
      ignoreMissingApis,
      context
    });
  }
};

export const registerApiHandler = ({
  api,
  protocol,
  methodName,
  relativeUrl,
  finalizer,
  context = globalDefaultExpressContext
}: {
  api: Api;
  protocol: string;
  methodName: string | undefined;
  relativeUrl: string;
  finalizer: () => void;
  context?: YaschemaApiExpressContext;
}) => {
  // Keeping track of which APIs were registered in case we perform detectMissingApiHandlers later
  context.registeredYaschemaApis.add(api);

  // We want:
  // - HTTP to be the lowest-priority protocol
  // - Longer matches to be processed before shorter ones
  // - Literal matches to be processed before patterns
  context.pendingYaschemaApiRegistrations[
    `${protocol.replace(/^http$/g, '!!!!')}~${methodName ?? '!!!!'}~${relativeUrl.replace(/[{}]/g, '!')}`
  ] = {
    api,
    finalizer
  };
};
