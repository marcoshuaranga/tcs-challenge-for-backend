#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { TcsChallengeStack } from '../lib/tcs-challenge-stack';
import { TcsChallengeWebStack } from '../lib/tcs-challenge-web-stack';
import { loadEnvVars } from '../lib/helpers';

const app = new cdk.App();
const envVars = loadEnvVars(app.node.tryGetContext('mode'));

const mainStack = new TcsChallengeStack(
  app,
  `TcsChallengeStack-${envVars.DEPLOY_ENV}`,
  {
    env: { account: envVars.AWS_ACCOUNT_ID, region: envVars.AWS_REGION },
    tags: { Project: 'tcs-challenge', Owner: 'maracudev', Env: envVars.DEPLOY_ENV },
    description: `TCS Challenge — async order-processing platform (Lambdas, DynamoDB, SQS) [${envVars.DEPLOY_ENV}]`,
    stackName: `tcs-challenge-${envVars.DEPLOY_ENV}`,
  },
  {
    failAboveAmount: envVars.FAIL_ABOVE_AMOUNT,
    jwtSecret: envVars.JWT_SECRET,
  },
);

const webStack = new TcsChallengeWebStack(app, `TcsChallengeWebStack-${envVars.DEPLOY_ENV}`, {
  env: { account: envVars.AWS_ACCOUNT_ID, region: envVars.AWS_REGION },
  tags: { Project: 'tcs-challenge', Owner: 'maracudev', Env: envVars.DEPLOY_ENV },
  description: `TCS Challenge — web frontend (S3 + CloudFront) [${envVars.DEPLOY_ENV}]`,
  stackName: `tcs-challenge-web-${envVars.DEPLOY_ENV}`,
});

new cdk.CfnOutput(mainStack, 'OrdersApiUrl', { value: mainStack.ordersApiUrl });
new cdk.CfnOutput(mainStack, 'ApiDocsUrl', { value: mainStack.apiDocsUrl });
new cdk.CfnOutput(webStack, 'WebUrl', { value: webStack.webUrl });
