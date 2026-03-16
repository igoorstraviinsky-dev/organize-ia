import Constants from 'expo-constants';

type ExpoExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

function getRequiredEnvValue(key: keyof ExpoExtra) {
  const value = extra[key];

  if (!value) {
    throw new Error(`Missing Expo extra config: ${key}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getRequiredEnvValue('supabaseUrl'),
  supabaseAnonKey: getRequiredEnvValue('supabaseAnonKey'),
};
