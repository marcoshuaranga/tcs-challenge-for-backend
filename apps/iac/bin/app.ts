#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { TcsChallengeStack } from '../lib/tcs-challenge-stack';

const envFile = path.resolve(__dirname, '../../../.env.deploy');
dotenv.config({ path: envFile });

const app = new cdk.App();
new TcsChallengeStack(app, 'TcsChallengeStack', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'],
  },
});
