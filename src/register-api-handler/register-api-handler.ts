import { getLogger } from '../config/logging';

let globalPendingApiRegistrations: Record<string, { humanReadableKey: string; finalizer: () => void }> = {};

/** Call once all APIs are registered, using `registerApiHandler` or `registerHttpApiHandler` for example, to reorder the registrations and
 * finalize registration with Express */
export const finalizeApiHandlerRegistrations = () => {
  const pendingApiRegistrations = globalPendingApiRegistrations;
  globalPendingApiRegistrations = {};

  const keys = Object.keys(pendingApiRegistrations).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    getLogger().info?.(`Registering API handler for ${pendingApiRegistrations[key].humanReadableKey}`);
    pendingApiRegistrations[key].finalizer();
  }
};

export const registerApiHandler = (protocol: string, methodName: string | undefined, relativeUrl: string, finalizer: () => void) => {
  // We want:
  // - HTTP to be the lowest-priority protocol
  // - Longer matches to be processed before shorter ones
  // - Literal matches to be processed before patterns
  globalPendingApiRegistrations[`${protocol.replace(/^http$/g, '!!!!')}~${methodName ?? '!!!!'}~${relativeUrl.replace(/[{}]/g, '!')}`] = {
    humanReadableKey: `${methodName ?? ''}${(methodName?.length ?? 0) > 0 ? ' ' : ''}${protocol}://${relativeUrl}`,
    finalizer
  };
};
