## ADDED Requirements

### Requirement: S3 bucket for web static assets
The CDK stack SHALL provision a private `AWS::S3::Bucket` to store the pre-built Astro static
files. The bucket SHALL have `autoDeleteObjects: true` and `DESTROY` removal policy.

#### Scenario: CDK template contains a private S3 bucket for web assets
- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains an `AWS::S3::Bucket` resource without public-read ACL

### Requirement: CloudFront distribution serving the web bucket
The CDK stack SHALL provision an `AWS::CloudFront::Distribution` that:
- Uses the web S3 bucket as its origin, protected via Origin Access Control (OAC).
- Redirects HTTP to HTTPS (`ViewerProtocolPolicy: redirect-to-https`).
- Sets `defaultRootObject` to `index.html`.
- Returns `index.html` with HTTP 200 for 404 errors (SPA fallback).

#### Scenario: CDK template contains a CloudFront distribution
- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains an `AWS::CloudFront::Distribution` resource

#### Scenario: Distribution enforces HTTPS
- **WHEN** the CloudFront distribution configuration is inspected
- **THEN** the default cache behaviour has `ViewerProtocolPolicy` set to `redirect-to-https`

### Requirement: BucketDeployment uploads web dist to S3
The CDK stack SHALL use `aws-s3-deployment.BucketDeployment` to upload `apps/web/dist/` to the web
S3 bucket and invalidate the CloudFront distribution on every deploy.

#### Scenario: CDK BucketDeployment targets the web bucket
- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains a custom resource that sources from
  `apps/web/dist/` and targets the web bucket

### Requirement: WebUrl CloudFormation output
The CDK stack SHALL export the CloudFront HTTPS URL as a `CfnOutput` named `WebUrl`.

#### Scenario: WebUrl output exists after deploy
- **WHEN** `cdk deploy` completes
- **THEN** the stack outputs include `WebUrl` with a `https://*.cloudfront.net` URL

### Requirement: Build-time env vars for web
`apps/web` SHALL be built with the following env vars set before `astro build`:
- `PUBLIC_API_URL` — value of `OrdersApiUrl` from the CDK stack output.
- `PUBLIC_API_DOCS_URL` — value of `ApiDocsUrl` from the CDK stack output.
- `DEMO_JWT` — a static demo token.

#### Scenario: Web pages reference correct API URLs at runtime
- **WHEN** the Astro site is built with `PUBLIC_API_URL` and `PUBLIC_API_DOCS_URL` set
- **THEN** the compiled HTML/JS uses those URLs for all API calls and documentation links
