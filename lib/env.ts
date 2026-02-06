// Environment variable validation and typed access

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  AUTH_DATABASE_URL: getRequiredEnv('AUTH_DATABASE_URL'),
  GCS_PROJECT_ID: getRequiredEnv('GCS_PROJECT_ID'),
  GCS_BUCKET_NAME: getRequiredEnv('GCS_BUCKET_NAME'),
  GCS_CLIENT_EMAIL: getRequiredEnv('GCS_CLIENT_EMAIL'),
  GCS_PRIVATE_KEY: getRequiredEnv('GCS_PRIVATE_KEY'),
  NEXTAUTH_SECRET: getRequiredEnv('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};
