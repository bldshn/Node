# Phase 4: Infrastructure as Code & CI/CD Deployment Guide

## Overview

This phase automates the deployment of your entire AWS infrastructure using AWS CDK v2 (TypeScript). Every resource — VPC, RDS, RDS Proxy, Lambda functions, and API Gateway — is defined as code and deployed reproducibly from a single terminal command.

## Prerequisites

### 1. Install AWS CDK v2 Globally

```bash
npm install -g aws-cdk@2
cdk --version  # should print 2.x.x
```

### 2. Configure AWS Credentials

CDK reads these to deploy into your AWS account:

```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, region (e.g., us-east-1), output format (json)
```

**For production CI/CD:** Use an IAM role with limited permissions instead of long-term credentials. See [GitHub Actions Setup](#github-actions-setup).

### 3. Bootstrap CDK in Your AWS Account

One-time setup — creates the S3 bucket CDK uses for assets:

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
# Replace YOUR_ACCOUNT_ID with your 12-digit AWS account ID
# Get it from: aws sts get-caller-identity --query Account
```

### 4. Install CDK Dependencies

```bash
cd infra/cdk
pnpm install
```

## CDK Application Structure

```
infra/cdk/
├── bin/
│   └── app.ts                 # Entry point — instantiates all stacks
├── lib/
│   ├── DatabaseStack.ts       # VPC + RDS + RDS Proxy + Secrets Manager
│   ├── LambdaStack.ts         # Lambda functions (bundled with esbuild)
│   └── ApiGatewayStack.ts     # API Gateway routing
├── cdk.json                   # CDK configuration
├── tsconfig.json              # TypeScript compiler options
└── package.json               # Dependencies
```

### Stack Dependency Order

1. **DatabaseStack** → Creates VPC, RDS, RDS Proxy, Secrets Manager
2. **LambdaStack** → References VPC, security group, and DB secret from DatabaseStack
3. **ApiGatewayStack** → References Lambda functions from LambdaStack

## Deploying to AWS

### Step 1: Synthesize CloudFormation

Preview the CloudFormation YAML without deploying:

```bash
cd infra/cdk
pnpm synth
# Outputs CloudFormation YAML to cdk.out/ — review before deploying
```

### Step 2: Diff Against Current Stack

See exactly what will be added, modified, or destroyed:

```bash
pnpm diff
```

### Step 3: Deploy All Stacks

```bash
pnpm deploy
# Or: pnpm deploy:ci (for CI/CD environments)
```

**Deployment times:**
- **First deploy:** ~15 minutes (RDS creation is slow)
- **Subsequent deploys:** 2-5 minutes

CDK prints outputs when done:
```
Outputs:
EcommerceDatabase.RdsProxyEndpoint = ecommerce-proxy-xxxx.proxy-xxxxxxx.us-east-1.rds.amazonaws.com
EcommerceApi.ApiUrlForFrontend = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1/
```

### Step 4: Run Database Migrations

After successful CDK deployment, run migrations to create tables:

```bash
# Get the RDS Proxy endpoint from CDK output (see above)
# Get credentials from AWS Secrets Manager console

DB_HOST=ecommerce-proxy-xxxx.proxy-xxxxxxx.us-east-1.rds.amazonaws.com \
DB_PORT=5432 \
DB_NAME=ecommerce \
DB_USER=ecommerce_app \
DB_PASSWORD=<from-secrets-manager> \
DB_SSL=true \
  pnpm db:migrate
```

**Or use the shorthand for local dev:**
```bash
pnpm db:migrate:local
```

## Stack Details

### DatabaseStack

**Creates:**
- VPC with 2 availability zones (high availability)
- RDS PostgreSQL 15.3 (t3.micro for MVP)
- RDS Proxy for connection pooling
- AWS Secrets Manager secret for DB credentials

**Outputs:**
- `RdsProxyEndpoint` — used by Lambda
- `DbSecretArn` — used by Lambda to read credentials
- `VpcId` — reference for other stacks

**Notes:**
- Multi-AZ is disabled for MVP (enable in production)
- Deletion protection is disabled for MVP (enable in production)
- Automatic backups: 7 days
- CloudWatch Logs exports: enabled

### LambdaStack

**Creates:**
- 6 Lambda functions (one per handler)
- Each function:
  - Runtime: Node.js 20.x
  - Architecture: ARM64 (better cost)
  - Memory: 512 MB
  - Timeout: 30s (60s for createOrder)
  - Bundled with esbuild at deploy time
  - Environment variables: DB_HOST, DB_NAME, etc.
  - VPC: Private subnets + security group
  - CloudWatch Logs: JSON format + X-Ray tracing

**Functions:**
1. `GetProductsFunction` — GET /products
2. `GetProductByIdFunction` — GET /products/{id}
3. `CreateProductFunction` — POST /products
4. `GetOrdersFunction` — GET /orders
5. `CreateOrderFunction` — POST /orders
6. `CreateUserFunction` — POST /users

**Notes:**
- All functions share the same VPC, security group, and environment variables
- Each function has permission to read the DB secret
- Automatic esbuild bundling removes unused code

### ApiGatewayStack

**Creates:**
- REST API with CORS enabled
- Deployment stage: `/v1/`
- Throttling: 10k req/s sustained, 20k burst
- Logging: INFO level with CloudWatch Logs

**Routes:**
- `GET /v1/products`
- `GET /v1/products/{id}`
- `POST /v1/products`
- `GET /v1/orders`
- `POST /v1/orders`
- `POST /v1/users`

**Outputs:**
- `ApiUrl` — Base API Gateway URL
- `ApiUrlForFrontend` — With `/v1` stage included

## Database Migrations

The `runMigrations.ts` script:

1. Connects to the database
2. Creates a `migrations` tracking table
3. Reads all `.sql` files in `apps/backend/src/database/`
4. Tracks which migrations have been applied
5. Skips already-applied migrations (safe to run multiple times)

**Example:**
```bash
# First run: applies 001-create-tables.sql
# Second run: skips 001-create-tables.sql, applies any new migrations

DB_HOST=localhost pnpm db:migrate:local
# ✓ Connected to PostgreSQL
# ✓ Migrations table ready
# 📋 Found 1 migration files:
#   - 001-create-tables.sql
# ⚙ Running migration: 001-create-tables.sql
# ✓ Successfully applied 001-create-tables.sql
# 📊 Migration Summary
#   Applied: 1
#   Skipped: 0
```

## Environment Variables

### Lambda Functions

These are set automatically by CDK:

```bash
DB_HOST=<rds-proxy-endpoint>
DB_PORT=5432
DB_NAME=ecommerce
DB_SECRET_ARN=arn:aws:secretsmanager:...
DB_POOL_MAX=5
NODE_ENV=production
LOG_LEVEL=INFO
```

Lambda reads `DB_SECRET_ARN` at runtime and fetches credentials from Secrets Manager. This is more secure than storing credentials in env vars.

### Frontend (Vercel)

Set these in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1/
```

## Local Development

### Start Local PostgreSQL

```bash
docker run \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

### Run Migrations Locally

```bash
pnpm db:migrate:local
```

### Start Lambda Locally

```bash
cd apps/api
pnpm dev
# Starts serverless-offline on http://localhost:3000
```

## GitHub Actions CI/CD Setup

### 1. Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```
AWS_ACCOUNT_ID              = Your 12-digit AWS account ID
AWS_ROLE_TO_ASSUME          = arn:aws:iam::ACCOUNT:role/GitHubActionsRole (optional)
AWS_ACCESS_KEY_ID           = IAM user access key (alternative to role)
AWS_SECRET_ACCESS_KEY       = IAM user secret key (alternative to role)
VERCEL_TOKEN                = From vercel.com → Account Settings → Tokens
VERCEL_ORG_ID               = From vercel.com → Team Settings → Team ID
VERCEL_PROJECT_ID           = From vercel.com → Project → Settings → Project ID
```

### 2. Create IAM User for CI/CD (Alternative to Role)

If using access keys instead of IAM role:

```bash
# Create CI/CD user
aws iam create-user --user-name github-actions-ci-cd

# Create access key
aws iam create-access-key --user-name github-actions-ci-cd
# Save AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# Attach policy for CDK + RDS access
aws iam attach-user-policy \
  --user-name github-actions-ci-cd \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### 3. Workflow Triggers

The `.github/workflows/deploy.yml` workflow:

- **On push to main:** Type-check → Deploy backend → Deploy frontend
- **On pull request:** Type-check → Frontend preview deploy

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### 4. Monitor Deployments

- **GitHub Actions:** Settings → Actions → Workflow runs
- **AWS CloudFormation:** Console → Stacks → EcommerceLambda, EcommerceDatabase, EcommerceApi
- **Vercel:** Dashboard → Deployments

## Troubleshooting

### CDK Deploy Fails: "User is not authorized to perform: cloudformation:CreateStack"

**Cause:** AWS credentials not configured or insufficient permissions.

**Fix:**
```bash
aws sts get-caller-identity  # Verify credentials
cdk bootstrap aws://ACCOUNT/region  # Re-bootstrap if needed
```

### RDS Creation Fails: "Invalid db instance class"

**Cause:** t3.micro not available in your region.

**Fix:** Edit `DatabaseStack.ts`:
```typescript
instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
```

### Lambda Cannot Connect to RDS Proxy

**Cause:** Security group rules not configured.

**Fix:** CDK should handle this automatically. If not, check:
1. Lambda is in same VPC as RDS Proxy
2. RDS Proxy security group allows inbound 5432 from Lambda security group

### Migration Script Hangs

**Cause:** Database connection timeout or firewall blocking.

**Fix:**
```bash
# Test connection
psql -h <rds-proxy-endpoint> -U ecommerce_app -d ecommerce

# Add SSL if needed
DB_SSL=true pnpm db:migrate
```

## Monitoring

### CloudWatch Logs

Lambda logs are automatically sent to CloudWatch:

```bash
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `ecommerce`)].logGroupName'
```

### X-Ray Tracing

Lambda functions are configured with X-Ray tracing enabled. View traces in the AWS Console:

**X-Ray → Service Map** → Shows all Lambda invocations, database calls, and latencies.

### API Gateway Metrics

CloudWatch Metrics are automatically created:

- **Count:** Number of API requests
- **Latency:** P50, P90, P99 latencies
- **4XXError, 5XXError:** Error rates

## Production Checklist

Before deploying to production:

- [ ] Update `DatabaseStack.ts`: `multiAz: true` (high availability)
- [ ] Update `DatabaseStack.ts`: `deletionProtection: true`
- [ ] Update `DatabaseStack.ts`: `removalPolicy: RemovalPolicy.RETAIN`
- [ ] Update `DatabaseStack.ts`: `requireTls: true` (RDS Proxy)
- [ ] Update `ApiGatewayStack.ts`: Increase throttling limits if needed
- [ ] Set up CloudWatch alarms for error rates
- [ ] Enable backups with cross-region replication
- [ ] Review VPC security group rules
- [ ] Enable IAM authentication for RDS
- [ ] Use AWS Secrets Manager rotation for DB password
- [ ] Set up CloudTrail for audit logging
- [ ] Enable GuardDuty for security monitoring

## Rollback

To rollback to a previous deployment:

```bash
# See all stacks
aws cloudformation list-stacks --query 'StackSummaries[?StackStatus!=`DELETE_COMPLETE`]'

# See previous versions
aws cloudformation describe-stack-resources --stack-name EcommerceLambda

# Cancel a currently updating stack
aws cloudformation cancel-update-stack --stack-name EcommerceLambda

# Redeploy previous version
cdk deploy --all
```

## Cleanup

To delete all resources and stop incurring charges:

```bash
# Destroy all stacks
cdk destroy --all

# Confirm deletion of RDS database
# (Requires confirmation due to deletionProtection in production)
```

This deletes:
- Lambda functions
- API Gateway
- RDS instance
- RDS Proxy
- VPC
- Secrets Manager secret
- CloudWatch Logs

## Next Steps

1. **Deploy to AWS:** Run `pnpm cdk:deploy`
2. **Run migrations:** Run `pnpm db:migrate`
3. **Test endpoints:** Use cURL or Postman with the API URL
4. **Deploy frontend:** See [Frontend Deployment](../../apps/frontend/README.md)
5. **Proceed to Phase 5:** End-to-end testing

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [RDS Proxy Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [GitHub Actions AWS Setup](https://github.com/aws-actions/configure-aws-credentials)
