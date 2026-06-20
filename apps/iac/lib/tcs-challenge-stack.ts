import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import { Construct } from 'constructs';

export class TcsChallengeStack extends cdk.Stack {
  readonly ordersApiUrl: string;
  readonly apiDocsUrl: string;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    params: {
      jwtSecret: string;
      failAboveAmount: string;
    },
  ) {
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

    // SQS DLQ + main queue
    const dlq = new sqs.Queue(this, 'OrdersDlq', {
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const queue = new sqs.Queue(this, 'OrdersQueue', {
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // orders-api Lambda
    const ordersApiLogGroup = new logs.LogGroup(this, 'OrdersApiLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ordersApiLambda = new lambdaNodejs.NodejsFunction(this, 'OrdersApiLambda', {
      entry: path.join(__dirname, '../../orders-api/src/lambda.ts'),
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logGroup: ordersApiLogGroup,
      environment: {
        ORDERS_TABLE: table.tableName,
        QUEUE_URL: queue.queueUrl,
        JWT_SECRET: params.jwtSecret,
        FAIL_ABOVE_AMOUNT: params.failAboveAmount,
        USE_AWS_DYNAMO: 'true',
        USE_AWS_SQS: 'true',
        AWS_ACCOUNT_ID: this.account,
      },
    });

    table.grantReadWriteData(ordersApiLambda);
    queue.grantSendMessages(ordersApiLambda);

    // API Gateway HTTP API
    const httpApi = new apigwv2.HttpApi(this, 'OrdersHttpApi');
    const ordersApiIntegration = new apigwv2integrations.HttpLambdaIntegration(
      'OrdersApiIntegration',
      ordersApiLambda,
    );

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: ordersApiIntegration,
    });

    // orders-worker Lambda
    const ordersWorkerLogGroup = new logs.LogGroup(this, 'OrdersWorkerLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ordersWorkerLambda = new lambdaNodejs.NodejsFunction(this, 'OrdersWorkerLambda', {
      entry: path.join(__dirname, '../../orders-worker/src/lambda-handler.ts'),
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logGroup: ordersWorkerLogGroup,
      environment: {
        ORDERS_TABLE: table.tableName,
        QUEUE_URL: queue.queueUrl,
        FAIL_ABOVE_AMOUNT: params.failAboveAmount,
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
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logGroup: apiDocsLogGroup,
      environment: {
        API_URL: httpApi.url ?? '',
      },
    });

    const apiDocsHttpApi = new apigwv2.HttpApi(this, 'ApiDocsHttpApi');
    const apiDocsIntegration = new apigwv2integrations.HttpLambdaIntegration(
      'ApiDocsIntegration',
      apiDocsLambda,
    );

    apiDocsHttpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: apiDocsIntegration,
    });

    this.ordersApiUrl = httpApi.url ?? '';
    this.apiDocsUrl = apiDocsHttpApi.url ?? '';
  }
}
