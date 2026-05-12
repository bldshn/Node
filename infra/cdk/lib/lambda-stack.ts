import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Example Lambda function for products
    new lambda.Function(this, 'GetProductsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_NAME: process.env.DB_NAME || 'ecommerce',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
      },
    });
  }
}
