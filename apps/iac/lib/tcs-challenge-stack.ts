import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
import { CustomResourceConfig } from 'aws-cdk-lib/custom-resources';

export class TcsChallengeStack extends cdk.Stack {
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

    CustomResourceConfig.of(this).addLogRetentionLifetime(logs.RetentionDays.ONE_WEEK);
    CustomResourceConfig.of(this).addRemovalPolicy(cdk.RemovalPolicy.DESTROY);

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
      visibilityTimeout: cdk.Duration.seconds(30),
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
    const httpApi = new apigwv2.HttpApi(this, 'OrdersHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['content-type', 'authorization'],
      },
    });
    const ordersApiIntegration = new apigwv2integrations.HttpLambdaIntegration(
      'OrdersApiIntegration',
      ordersApiLambda,
    );

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: ordersApiIntegration,
    });

    new cdk.CfnOutput(this, 'OrdersApiUrl', { value: httpApi.url ?? '' });

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

    new cdk.CfnOutput(this, 'ApiDocsUrl', { value: apiDocsHttpApi.url ?? '' });

    // web static site — S3 + CloudFront
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    /**
     * CloudFront Function code to rewrite URLs for Astro's "directory index" style routing.
     * This is necessary because Astro generates static sites with "directory index" style routing, where URLs like `/about` are served from `/about/index.html`.
     * The function rewrites requests to append `index.html` to the URI when necessary.
     */
    const astroDirectoryIndexRewriteCode = `function handler(event) {
      var request = event.request;
      var uri = request.uri;

      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else if (!uri.includes('.')) {
        request.uri = uri + '/index.html';
      }

      return request;
    }`;

    const webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: new cloudfront.Function(this, 'UrlRewriteFn', {
              code: cloudfront.FunctionCode.fromInline(astroDirectoryIndexRewriteCode),
              runtime: cloudfront.FunctionRuntime.JS_2_0,
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        },
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        },
      ],
    });

    const bucketDeploymentLogGroup = new logs.LogGroup(this, 'BucketDeploymentLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new s3deploy.BucketDeployment(this, 'WebDeploy', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../web/dist'))],
      destinationBucket: webBucket,
      distribution: webDistribution,
      distributionPaths: ['/*'],
      logGroup: bucketDeploymentLogGroup,
    });

    new cdk.CfnOutput(this, 'WebUrl', { value: `https://${webDistribution.domainName}` });
  }
}
