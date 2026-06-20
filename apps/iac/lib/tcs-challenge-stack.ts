import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
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
        JWT_SECRET: process.env['JWT_SECRET'] ?? '',
        FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'] ?? '1000',
        USE_AWS_DYNAMO: 'true',
        AWS_ACCOUNT_ID: this.account,
      },
    });

    table.grantReadWriteData(ordersApiLambda);

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
  }
}
