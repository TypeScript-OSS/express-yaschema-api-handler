import type { Express } from 'express';

import type { YaschemaApiExpressContext } from './YaschemaApiExpressContext.js';

export interface YaschemaApiExpressContextAccessor {
  getYaschemaApiExpressContext?: () => YaschemaApiExpressContext;
}

/** This modifies the specified Express object in place, and also returns the same modified instance, adding support for the
 * `YaschemaApiExpressContextAccessor`, which should be used when initializing multiple HTTP servers simultaneously within a single JS
 * environment */
export const addYaschemaApiExpressContextAccessorToExpress = <ExpressT extends Express>(
  express: ExpressT,
  context: YaschemaApiExpressContext
): ExpressT & YaschemaApiExpressContextAccessor => {
  const modifiedExpress = express as ExpressT & YaschemaApiExpressContextAccessor;
  modifiedExpress.getYaschemaApiExpressContext = () => context;
  return modifiedExpress;
};
