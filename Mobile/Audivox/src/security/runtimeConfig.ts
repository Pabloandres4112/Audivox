import { NativeModules } from 'react-native';

type NativeSecurityModule = {
  LASTFM_API_KEY?: string;
  YOUTUBE_CONVERTER_ENDPOINT?: string;
  AUDIVOX_WORKER_URL?: string;
  STRICT_MODE_ENABLED?: boolean | string;
  COMPROMISED_ENVIRONMENT?: boolean | string;
};

const nativeSecurity = (NativeModules.AudivoxSecurity ?? {}) as NativeSecurityModule;

const readString = (value?: string) => (typeof value === 'string' ? value.trim() : '');

const readBoolean = (value: boolean | string | undefined, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

export const runtimeConfig = {
  lastfmApiKey: readString(nativeSecurity.LASTFM_API_KEY),
  youtubeConverterEndpoint: readString(nativeSecurity.YOUTUBE_CONVERTER_ENDPOINT),
  audivoxWorkerUrl: readString(nativeSecurity.AUDIVOX_WORKER_URL),
  strictModeEnabled: readBoolean(nativeSecurity.STRICT_MODE_ENABLED, true),
  compromisedEnvironment: readBoolean(nativeSecurity.COMPROMISED_ENVIRONMENT, false),
};
