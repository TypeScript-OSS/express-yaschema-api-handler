import type { Api } from 'yaschema-api';

export interface YaschemaApiExpressContext {
  isYaschemaApiExpressContext: true;
  pendingYaschemaApiRegistrations: Record<string, { api: Api; finalizer: () => void }>;
  registeredYaschemaApis: Set<Api>;
}

export const makeYaschemaApiExpressContext = (): YaschemaApiExpressContext => ({
  isYaschemaApiExpressContext: true,
  pendingYaschemaApiRegistrations: {},
  registeredYaschemaApis: new Set<Api>()
});

export const isYaschemaApiExpressContext = (value: any): value is YaschemaApiExpressContext =>
  value !== null &&
  typeof value === 'object' &&
  'isYaschemaApiExpressContext' in value &&
  (value as { isYaschemaApiExpressContext: any }).isYaschemaApiExpressContext === true;
