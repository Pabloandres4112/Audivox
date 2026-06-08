import { assertAllowedRemoteUrl } from './networkPolicy';
import { runtimeConfig } from './runtimeConfig';

export const securityService = {
  isStrictModeEnabled: () => runtimeConfig.strictModeEnabled,
  isCompromisedEnvironment: () => runtimeConfig.compromisedEnvironment,
  getRuntimeConfig: () => runtimeConfig,
  assertRemoteUrl: (value: string) => assertAllowedRemoteUrl(value),
};
