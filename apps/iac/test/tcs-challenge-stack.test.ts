import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it, beforeAll } from 'vitest';
import { TcsChallengeStack } from '../lib/tcs-challenge-stack';

let template: Template;

beforeAll(() => {
  const app = new cdk.App();
  const stack = new TcsChallengeStack(app, 'TestStack');
  template = Template.fromStack(stack);
});

describe('DynamoDB table', () => {
  it('has PAY_PER_REQUEST billing mode', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  it('has GSI named GSI1', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([Match.objectLike({ IndexName: 'GSI1' })]),
    });
  });

  it('has DESTROY removal policy (DeletionPolicy: Delete)', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Delete',
    });
  });
});

describe('SQS queue + DLQ', () => {
  it('stack has exactly two SQS queues', () => {
    template.resourceCountIs('AWS::SQS::Queue', 2);
  });

  it('main queue has RedrivePolicy with maxReceiveCount 3', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: Match.objectLike({
        maxReceiveCount: 3,
      }),
    });
  });

  it('DLQ has 14-day message retention (1209600 seconds)', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 1209600,
    });
  });
});

describe('orders-api Lambda + API Gateway', () => {
  it('orders-api log group has 7-day retention and DESTROY policy', () => {
    template.hasResource('AWS::Logs::LogGroup', {
      Properties: {
        RetentionInDays: 7,
      },
      DeletionPolicy: 'Delete',
    });
  });

  it('orders-api Lambda has required env vars', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          ORDERS_TABLE: Match.anyValue(),
          USE_AWS_DYNAMO: 'true',
          JWT_SECRET: Match.anyValue(),
          FAIL_ABOVE_AMOUNT: Match.anyValue(),
        }),
      },
    });
  });

  it('orders-api Lambda has DynamoDB IAM policy', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['dynamodb:PutItem']),
          }),
        ]),
      },
    });
  });

  it('stack has an HTTP API Gateway', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  it('stack has an HTTP API Lambda integration', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Integration', 1);
  });
});
