import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import { Construct } from 'constructs';

export class TcsChallengeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table
    const table = new dynamodb.Table(this, 'OrdersTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    new cdk.CfnOutput(this, 'OrdersTableName', { value: table.tableName });

    // SQS DLQ + main queue
    const dlq = new sqs.Queue(this, 'OrdersDlq', {
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const queue = new sqs.Queue(this, 'OrdersQueue', {
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, 'OrdersQueueUrl', { value: queue.queueUrl });

    // orders-api Lambda
    const ordersApiLogGroup = new logs.LogGroup(this, 'OrdersApiLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ordersApiLambda = new lambdaNodejs.NodejsFunction(this, 'OrdersApiLambda', {
      entry: path.join(__dirname, '../../orders-api/src/lambda.ts'),
      logGroup: ordersApiLogGroup,
      environment: {
        ORDERS_TABLE: table.tableName,
        QUEUE_URL: queue.queueUrl,
        JWT_SECRET: process.env['JWT_SECRET'] ?? '',
        FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'] ?? '1000',
        USE_AWS_DYNAMO: 'true',
        USE_AWS_SQS: 'true',
        AWS_ACCOUNT_ID: this.account,
      },
    });

    table.grantReadWriteData(ordersApiLambda);
    queue.grantSendMessages(ordersApiLambda);

    // API Gateway HTTP API
    const httpApi = new apigwv2.HttpApi(this, 'OrdersHttpApi');

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwv2integrations.HttpLambdaIntegration(
        'OrdersApiIntegration',
        ordersApiLambda,
      ),
    });

    new cdk.CfnOutput(this, 'OrdersApiUrl', { value: httpApi.url ?? '' });

    // orders-worker Lambda
    const ordersWorkerLogGroup = new logs.LogGroup(this, 'OrdersWorkerLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ordersWorkerLambda = new lambdaNodejs.NodejsFunction(this, 'OrdersWorkerLambda', {
      entry: path.join(__dirname, '../../orders-worker/src/lambda-handler.ts'),
      logGroup: ordersWorkerLogGroup,
      environment: {
        ORDERS_TABLE: table.tableName,
        QUEUE_URL: queue.queueUrl,
        FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'] ?? '1000',
        USE_AWS_DYNAMO: 'true',
        USE_AWS_SQS: 'true',
        AWS_ACCOUNT_ID: this.account,
      },
    });

    table.grantReadWriteData(ordersWorkerLambda);
    queue.grantConsumeMessages(ordersWorkerLambda);

    ordersWorkerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(queue, { batchSize: 1 }),
    );

    // api-docs Lambda
    const apiDocsLogGroup = new logs.LogGroup(this, 'ApiDocsLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiDocsLambda = new lambdaNodejs.NodejsFunction(this, 'ApiDocsLambda', {
      entry: path.join(__dirname, '../../api-docs/src/lambda.ts'),
      logGroup: apiDocsLogGroup,
    });

    const apiDocsHttpApi = new apigwv2.HttpApi(this, 'ApiDocsHttpApi');

    apiDocsHttpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwv2integrations.HttpLambdaIntegration(
        'ApiDocsIntegration',
        apiDocsLambda,
      ),
    });

    new cdk.CfnOutput(this, 'ApiDocsUrl', { value: apiDocsHttpApi.url ?? '' });

    // web static site — S3 + CloudFront
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        },
      ],
    });

    new s3deploy.BucketDeployment(this, 'WebDeploy', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../web/dist'))],
      destinationBucket: webBucket,
      distribution: webDistribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'WebUrl', { value: `https://${webDistribution.domainName}` });
  }
}
