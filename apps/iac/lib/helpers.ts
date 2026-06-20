import * as dotenv from 'dotenv';
import * as path from 'node:path';

export function loadEnvVars(mode?: string) {
  const root = path.resolve(__dirname, '../../..');
  const base = path.join(root, '.env');

  const envFile = mode ? `${base}.${mode}` : base;

  const { error } = dotenv.config({ path: envFile });

  if (error) {
    console.warn(`Could not load environment variables from ${envFile}: ${error.message}`);
  }

  if (process.env['JWT_SECRET'] === undefined) {
    console.warn('JWT_SECRET is not set. This may cause security issues in production.');
  }

  return {
    AWS_ACCOUNT_ID: process.env['AWS_ACCOUNT_ID'] ?? '000000000000',
    AWS_REGION: process.env['AWS_REGION'] ?? 'us-east-1',
    DEPLOY_ENV: process.env['DEPLOY_ENV'] ?? 'dev',
    FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'] ?? '1000',
    JWT_SECRET: process.env['JWT_SECRET'],
  };
}
