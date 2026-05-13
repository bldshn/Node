#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/DatabaseStack';
import { LambdaStack } from '../lib/LambdaStack';
import { ApiGatewayStack } from '../lib/ApiGatewayStack';

const app = new cdk.App();

// ─────────────────────────────────────────────────────────────
// Deploy order matters: Database → Lambda → API Gateway
// ─────────────────────────────────────────────────────────────

// 1. Database (VPC, RDS, RDS Proxy, Secrets Manager)
const dbStack = new DatabaseStack(app, 'EcommerceDatabase', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

// 2. Lambda functions (bundled with esbuild)
const lambdaStack = new LambdaStack(app, 'EcommerceLambda', {
  vpc: dbStack.vpc,
  dbSecret: dbStack.dbSecret,
  rdsProxyEndpoint: dbStack.rdsProxyEndpoint,
  lambdaSecurityGroup: dbStack.lambdaSecurityGroup,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
lambdaStack.addDependency(dbStack);

// 3. API Gateway (routes Lambda functions)
const apiStack = new ApiGatewayStack(app, 'EcommerceApi', {
  getProductsFunction: lambdaStack.getProductsFunction,
  getProductByIdFunction: lambdaStack.getProductByIdFunction,
  createProductFunction: lambdaStack.createProductFunction,
  getOrdersFunction: lambdaStack.getOrdersFunction,
  createOrderFunction: lambdaStack.createOrderFunction,
  createUserFunction: lambdaStack.createUserFunction,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
apiStack.addDependency(lambdaStack);
