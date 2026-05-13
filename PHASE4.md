# Phase 4: Infrastructure as Code & CI/CD - Complete Implementation

## Overview

Phase 4 has implemented a complete Infrastructure as Code (IaC) and CI/CD pipeline using AWS CDK v2 and GitHub Actions. Every AWS resource is now defined as TypeScript code, version-controlled in Git, and deployable reproducibly from a single command.

## What's Been Implemented

### 1. AWS CDK Application (TypeScript)

Located in `infra/cdk/`, the CDK app defines three stacks:

#### DatabaseStack (`lib/DatabaseStack.ts`)
- **VPC:** 2 availability zones for high availability
  - Public subnets with NAT Gateway
  - Private subnets for RDS
- **RDS PostgreSQL 15.3:** 
  - t3.micro instance (tunable for production)
  - 20 GB storage (GP3)
  - Automated backups: 7 days
  - CloudWatch Logs export enabled
- **RDS Proxy:** Connection pooling multiplexer
  - Max 100% of RDS connections
  - Borrow timeout: 30 seconds
  - Exclusive session pinning disabled (for Lambda compatibility)
- **AWS Secrets Manager:** Stores DB credentials
  - Username: `ecommerce_app`
  - Password: Auto-generated 32-character secret
- **Security Group:** Lambda-to-RDS communication

**Outputs:**
- `RdsProxyEndpoint` — RDS Proxy endpoint for Lambda
- `DbSecretArn` — Reference to DB credentials
- `VpcId` — VPC ID for other stacks

#### LambdaStack (`lib/LambdaStack.ts`)
- **6 Lambda Functions:** One per handler endpoint
  - `GetProductsFunction` — GET /products
  - `GetProductByIdFunction` — GET /products/{id}
  - `CreateProductFunction` — POST /products
  - `GetOrdersFunction` — GET /orders
  - `CreateOrderFunction` — POST /orders (60s timeout for transactions)
  - `CreateUserFunction` — POST /users

- **Consistent Configuration for All Functions:**
  - Runtime: Node.js 20.x
  - Architecture: ARM64 (cost-optimized)
  - Memory: 512 MB
  - Timeout: 30s (60s for createOrder)
  - VPC: Private subnets + Lambda security group
  - Logging: JSON format + X-Ray tracing
  - Auto-bundling with esbuild (TypeScript → optimized JS)

- **Environment Variables (set for each Lambda):**
  - `DB_HOST=<rds-proxy-endpoint>`
  - `DB_PORT=5432`
  - `DB_NAME=ecommerce`
  - `DB_SECRET_ARN=arn:aws:secretsmanager:...`
  - `DB_POOL_MAX=5`
  - `NODE_ENV=production`
  - `LOG_LEVEL=INFO`

- **IAM Permissions:**
  - Each Lambda can read DB secret from Secrets Manager
  - Each Lambda can connect to RDS Proxy (via security group)
  - X-Ray write access for distributed tracing

#### ApiGatewayStack (`lib/ApiGatewayStack.ts`)
- **REST API with v1 stage:**
  - CORS enabled for all origins
  - Throttling: 10k req/s sustained, 20k burst
  - CloudWatch Logs: INFO level

- **6 Routes mounted:**
  ```
  GET    /products                 → GetProductsFunction
  GET    /products/{id}            → GetProductByIdFunction
  POST   /products                 → CreateProductFunction
  GET    /orders                   → GetOrdersFunction
  POST   /orders                   → CreateOrderFunction
  POST   /users                    → CreateUserFunction
  ```

- **Method Responses:**
  - Defined for each route (200, 201, 400, 404, 409, 500)
  - Enables CloudWatch metrics and error tracking

**Outputs:**
- `ApiUrl` — Base API Gateway URL
- `ApiUrlForFrontend` — API URL with `/v1` stage (for frontend env var)

### 2. CDK Configuration Files

#### `bin/app.ts` — Entry Point
- Instantiates all three stacks in dependency order
- Sets AWS account and region
- Establishes stack dependencies for proper deployment order

#### `cdk.json` — CDK Configuration
- Entry point: `npx ts-node --prefer-ts-exts bin/app.ts`
- Context settings for CDK behavior

#### `tsconfig.json` — TypeScript Configuration
- Target: ES2020
- Module: CommonJS
- Includes: bin/, lib/
- Excludes: node_modules/, dist/, cdk.out/

#### `package.json` — Dependencies & Scripts
```json
{
  "scripts": {
    "synth": "cdk synth",           // Preview CloudFormation
    "diff": "cdk diff",              // See what will change
    "deploy": "cdk deploy --all",    // Deploy all stacks
    "deploy:ci": "cdk deploy:ci"     // CI/CD friendly deploy
  },
  "dependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.3.0"
  }
}
```

### 3. Database Migrations

#### `infra/scripts/runMigrations.ts`
- Connects to PostgreSQL via `pg` driver
- Creates `migrations` tracking table on first run
- Reads all `.sql` files from `apps/backend/src/database/`
- Tracks applied migrations — skips already-applied ones
- Wraps each migration in a transaction for atomicity
- Safe to run multiple times (idempotent)

**Usage:**
```bash
# Local development
DB_HOST=localhost DB_PORT=5432 DB_NAME=ecommerce \
DB_USER=postgres DB_PASSWORD=postgres pnpm db:migrate:local

# AWS RDS Proxy (after CDK deployment)
DB_HOST=<rds-proxy-endpoint> DB_PORT=5432 DB_NAME=ecommerce \
DB_USER=ecommerce_app DB_PASSWORD=<secret> DB_SSL=true \
pnpm db:migrate
```

### 4. GitHub Actions CI/CD Workflow

Located in `.github/workflows/deploy.yml`, the workflow:

#### Jobs

**1. type-check** (runs on all commits)
- Installs dependencies
- Runs `pnpm -r type-check` across monorepo
- Prevents bad TypeScript from being deployed

**2. deploy-backend** (only on push to main)
- Requires: type-check pass
- Environment: production
- Steps:
  1. Checkout code
  2. Setup Node.js 20 + pnpm
  3. Install dependencies
  4. Configure AWS credentials (from GitHub secrets)
  5. Build API (`pnpm --filter api build`)
  6. Deploy CDK (`npx cdk deploy --all`)
  7. Extract API URL
  8. Comment on PR with deployment link

**3. deploy-frontend** (all branches)
- Requires: type-check pass
- Builds frontend (`pnpm --filter frontend build`)
- Deploys to Vercel:
  - **PR:** Preview deployment
  - **main:** Production deployment

#### Required GitHub Secrets

```
AWS_ACCOUNT_ID              # 12-digit AWS account ID
AWS_ROLE_TO_ASSUME          # Optional: IAM role ARN for OIDC
AWS_ACCESS_KEY_ID           # Alternative: IAM user key
AWS_SECRET_ACCESS_KEY       # Alternative: IAM user secret
VERCEL_TOKEN                # From vercel.com
VERCEL_ORG_ID               # From vercel.com
VERCEL_PROJECT_ID           # From vercel.com
```

### 5. Root package.json Scripts

```json
{
  "scripts": {
    "cdk:synth": "pnpm --filter @ecommerce/infra-cdk synth",
    "cdk:diff": "pnpm --filter @ecommerce/infra-cdk diff",
    "cdk:deploy": "pnpm --filter @ecommerce/infra-cdk deploy",
    "db:migrate": "ts-node infra/scripts/runMigrations.ts",
    "db:migrate:local": "DB_HOST=localhost ... ts-node ..."
  }
}
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Repository                       │
│  (Push to main or PR)                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │  GitHub Actions Workflow        │
         │  - type-check                   │
         │  - deploy-backend (main only)   │
         │  - deploy-frontend              │
         └──────┬────────────────┬─────────┘
                │                │
        ┌───────▼────────┐  ┌────▼────────────┐
        │   AWS Account  │  │  Vercel         │
        │   (CDK Deploy) │  │  (Next.js App)  │
        │                │  │                 │
        │ ┌────────────┐ │  │  ┌────────────┐ │
        │ │ VPC        │ │  │  │ Serverless │ │
        │ │ RDS        │ │  │  │ Functions  │ │
        │ │ RDS Proxy  │ │  │  │            │ │
        │ │ Lambda     │ │  │  │ Edge       │ │
        │ │ API GW     │ │  │  │ Caching    │ │
        │ └────────────┘ │  │  └────────────┘ │
        └────────────────┘  └─────────────────┘
```

## Key Design Decisions

### 1. Singleton Connection Pool (Module-level)
- Pool instantiated outside Lambda handler function
- Reused across warm invocations
- Prevents connection exhaustion under load
- 5 connections per Lambda × 50 instances = 250 total connections
- RDS Proxy multiplexes to fewer actual DB connections

### 2. RDS Proxy for Connection Pooling
- Multiplexes Lambda connections onto 1 RDS connection
- Borrow timeout: 30s (matches Lambda execution timeout)
- Exclusive session pinning disabled (Lambda doesn't use transactions in proxy)
- Cost-effective: prevents "too many connections" errors

### 3. Secrets Manager for Credentials
- DB password never in environment variables
- Lambda reads at runtime: `AWS.SecretsManager.getSecretValue(DB_SECRET_ARN)`
- Rotation-ready (can update secret without redeploying Lambda)
- Audit trail in CloudTrail

### 4. esbuild Bundling
- Automatic TypeScript → JavaScript transpilation
- Tree-shaking removes unused code
- Runs at CDK deploy time (no separate build step)
- Output: optimized bundle for each Lambda

### 5. Private VPC for RDS
- RDS not accessible from the internet
- Lambda in same VPC can reach it
- Security group rules enforce this
- NAT Gateway for outbound internet access from RDS (for patching)

### 6. GitHub Actions as Single Source of Truth
- All deployments go through Actions
- Consistent environments (prod vs dev)
- Audit trail of who deployed what
- Preview deploys on every PR

## Deployment Workflow

### Local Development
```bash
# 1. Start local PostgreSQL
docker run -p 5432:5432 postgres:15

# 2. Run migrations locally
pnpm db:migrate:local

# 3. Start Lambda locally
cd apps/api && pnpm dev

# 4. Start frontend locally
cd apps/frontend && pnpm dev
```

### First-Time AWS Deployment
```bash
# 1. One-time setup
npm install -g aws-cdk@2
aws configure
cdk bootstrap aws://123456789/us-east-1

# 2. Install CDK dependencies
cd infra/cdk && pnpm install

# 3. Preview changes
pnpm synth
pnpm diff

# 4. Deploy
pnpm deploy

# 5. Run migrations
DB_HOST=<from-CDK-output> pnpm db:migrate

# 6. Deploy frontend
cd apps/frontend && vercel --prod
```

### Subsequent Deployments (via GitHub)
```bash
# Just push to main or open a PR
git push origin main
# GitHub Actions handles the rest
```

## Monitoring & Observability

### CloudWatch Logs
- All Lambda logs auto-exported to CloudWatch
- JSON format for easy parsing
- Queryable via CloudWatch Insights:
  ```sql
  fields @timestamp, message, level, requestId
  | stats count() by level
  ```

### X-Ray Tracing
- Enabled for all Lambda functions
- Shows:
  - Lambda cold/warm start times
  - Database query latencies
  - API Gateway to Lambda latency
  - Error traces with full context

### CloudWatch Metrics
- API Gateway: Request count, latency, error rate
- Lambda: Duration, errors, concurrent executions
- RDS: Database connections, query latency, CPU

## Security Considerations

### In Production
- ✅ Multi-AZ RDS (automatic failover)
- ✅ Secrets rotation (set up in Secrets Manager)
- ✅ RDS encryption at rest
- ✅ VPC with private subnets
- ✅ Security groups: Lambda → RDS only
- ✅ CloudTrail for audit logging
- ⚠️ TODO: Enable IAM database authentication
- ⚠️ TODO: Set up VPC Flow Logs
- ⚠️ TODO: Enable GuardDuty for threat detection

### Credentials Management
- Never store DB password in Git
- Lambda reads from Secrets Manager at runtime
- GitHub Actions uses IAM role or temporary credentials
- Vercel env vars encrypted at rest

## Troubleshooting

### CDK Deploy Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Re-bootstrap if needed
cdk bootstrap aws://ACCOUNT/region

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name EcommerceLambda
```

### Lambda Cannot Connect to RDS
```bash
# Verify Lambda is in same VPC
aws lambda get-function-concurrency --function-name EcommerceLambda

# Check security group rules
aws ec2 describe-security-groups --filters Name=group-name,Values=LambdaSecurityGroup

# Test RDS connectivity
psql -h <rds-proxy-endpoint> -U ecommerce_app -d ecommerce
```

### Migration Script Fails
```bash
# Test database connection
psql -h <endpoint> -U ecommerce_app -d ecommerce -W

# Check migrations table
SELECT * FROM migrations;

# Enable SSL if needed
DB_SSL=true pnpm db:migrate
```

## Phase 4 Completion Checklist

- ✅ AWS CDK v2 application (bin/app.ts, 3 stacks)
- ✅ DatabaseStack: VPC + RDS + RDS Proxy + Secrets Manager
- ✅ LambdaStack: 6 Lambda functions with esbuild bundling
- ✅ ApiGatewayStack: REST API with all 6 routes
- ✅ cdk.json, tsconfig.json, package.json
- ✅ Database migration runner with tracking
- ✅ GitHub Actions CI/CD workflow
- ✅ Root package.json scripts
- ✅ Comprehensive deployment guide (DEPLOYMENT.md)
- ✅ .gitignore for CDK artifacts

## Next: Phase 5

End-to-end testing:
- User views product → Adds to cart → Checks out → Writes to DB
- Verify complete flow from frontend through API to database
- Load testing to verify connection pooling
