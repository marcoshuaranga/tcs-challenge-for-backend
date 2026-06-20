#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { TcsChallengeStack } from '../lib/tcs-challenge-stack';

const envFile = path.resolve(__dirname, '../../../.env');
const { error } = dotenv.config({ path: envFile });

if (error) throw new Error(`.env not found at ${envFile} — create it from .env.example`);

const app = new cdk.App();
const deployEnv = process.env['DEPLOY_ENV'] ?? 'dev';

new TcsChallengeStack(
  app,
  `TcsChallengeStack-${deployEnv}`,
  {
    description: `TCS Challenge — async order-processing platform (Lambdas, DynamoDB, SQS, CloudFront) [${deployEnv}]`,
    stackName: `tcs-challenge-${deployEnv}`,
    env: {
      account: process.env['AWS_ACCOUNT_ID'] ?? '000000000000',
      region: process.env['AWS_REGION'] ?? 'us-east-1',
    },
    tags: {
      Project: 'tcs-challenge',
      Owner: 'maracudev',
      Env: deployEnv,
    },
  },
  {
    failAboveAmount: process.env['FAIL_ABOVE_AMOUNT'] ?? '1000',
    jwtSecret: process.env['JWT_SECRET'] ?? '',
  },
);
