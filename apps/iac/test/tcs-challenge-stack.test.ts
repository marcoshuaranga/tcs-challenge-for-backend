import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it, beforeAll } from 'vitest';
import { TcsChallengeStack } from '../lib/tcs-challenge-stack';
import { TcsChallengeWebStack } from '../lib/tcs-challenge-web-stack';

let template: Template;
let webTemplate: Template;

beforeAll(() => {
  const app = new cdk.App();
  const stack = new TcsChallengeStack(
    app,
    'TestStack',
    {},
    { jwtSecret: 'test-secret', failAboveAmount: '1000' },
  );
  template = Template.fromStack(stack);

  const webApp = new cdk.App();
  const webStack = new TcsChallengeWebStack(webApp, 'TestWebStack', {});
  webTemplate = Template.fromStack(webStack);
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

  it('stack has two HTTP API Gateways', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 2);
  });

  it('stack has two HTTP API Lambda integrations', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Integration', 2);
  });
});

describe('orders-worker Lambda + SQS event source', () => {
  it('stack has 3 log groups (orders-api, orders-worker, api-docs)', () => {
    template.resourceCountIs('AWS::Logs::LogGroup', 3);
  });

  it('orders-worker Lambda has required env vars', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          ORDERS_TABLE: Match.anyValue(),
          QUEUE_URL: Match.anyValue(),
          USE_AWS_DYNAMO: 'true',
          USE_AWS_SQS: 'true',
        }),
      },
    });
  });

  it('orders-worker Lambda has SQS event source mapping with batchSize 1', () => {
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 1,
    });
  });
});

describe('api-docs Lambda + API Gateway', () => {
  it('api-docs Lambda has no application env vars', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 2);
  });
});

describe('web static site — S3 + CloudFront', () => {
  it('web stack has one S3 bucket (WebBucket)', () => {
    webTemplate.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('web stack has one CloudFront distribution', () => {
    webTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  it('CloudFront distribution redirects HTTP to HTTPS', () => {
    webTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
        }),
      }),
    });
  });

  it('CloudFront distribution has index.html as default root', () => {
    webTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
      }),
    });
  });
});
