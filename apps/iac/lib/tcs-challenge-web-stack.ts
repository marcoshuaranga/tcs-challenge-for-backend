import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';
import { CustomResourceConfig } from 'aws-cdk-lib/custom-resources';

export class TcsChallengeWebStack extends cdk.Stack {
  readonly webUrl: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    CustomResourceConfig.of(this).addLogRetentionLifetime(logs.RetentionDays.ONE_WEEK);
    CustomResourceConfig.of(this).addRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    // Rewrites `/about` → `/about/index.html` for Astro's directory-index routing
    const urlRewriteCode = `function handler(event) {
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
              code: cloudfront.FunctionCode.fromInline(urlRewriteCode),
              runtime: cloudfront.FunctionRuntime.JS_2_0,
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responsePagePath: '/index.html', responseHttpStatus: 200 },
        { httpStatus: 404, responsePagePath: '/index.html', responseHttpStatus: 200 },
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

    this.webUrl = `https://${webDistribution.domainName}`;
  }
}
