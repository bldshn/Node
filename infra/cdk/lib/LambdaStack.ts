import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

export interface LambdaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecret: secrets.Secret;
  rdsProxyEndpoint: string;
  lambdaSecurityGroup: ec2.SecurityGroup;
}

export class LambdaStack extends cdk.Stack {
  public readonly getProductsFunction: lambda.Function;
  public readonly getProductByIdFunction: lambda.Function;
  public readonly createProductFunction: lambda.Function;
  public readonly getOrdersFunction: lambda.Function;
  public readonly createOrderFunction: lambda.Function;
  public readonly createUserFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────────────────────
    // Shared environment variables for every Lambda function
    // ─────────────────────────────────────────────────────────────
    const environment = {
      DB_HOST: props.rdsProxyEndpoint,
      DB_PORT: '5432',
      DB_NAME: 'ecommerce',
      DB_SECRET_ARN: props.dbSecret.secretArn,
      DB_POOL_MAX: '5',
      NODE_ENV: 'production',
      LOG_LEVEL: 'INFO',
    };

    // ─────────────────────────────────────────────────────────────
    // Shared bundling config (esbuild)
    // TypeScript is transpiled, tree-shaken, and bundled automatically
    // ─────────────────────────────────────────────────────────────
    const bundling: lambda.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'node20',
      loader: {
        '.node': 'file',
      },
      externalModules: ['pg', 'aws-sdk'],
      commandHooks: {
        beforeBundling(inputDir: string, outputDir: string): string[] {
          return [];
        },
        afterBundling(inputDir: string, outputDir: string): string[] {
          return [];
        },
      },
    };

    // ─────────────────────────────────────────────────────────────
    // Helper — creates a Lambda function with consistent defaults
    // ─────────────────────────────────────────────────────────────
    const createHandler = (
      id: string,
      handlerPath: string,
      timeout: cdk.Duration = cdk.Duration.seconds(30)
    ): lambda.Function => {
      const func = new lambda.Function(this, id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../apps/api'),
          {
            bundling: {
              image: lambda.Runtime.NODEJS_20_X.bundlingImage,
              command: [
                'bash',
                '-c',
                `cd /asset-input && npx esbuild ${handlerPath} --bundle --platform=node --target=node20 --external:pg --outfile=/asset-output/index.js`,
              ],
              environment: {
                NODE_OPTIONS: '--enable-source-maps',
              },
            },
          }
        ),
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [props.lambdaSecurityGroup],
        environment,
        timeout,
        memorySize: 512,
        ephemeralStorageSize: cdk.Size.mebibytes(512),
        loggingFormat: lambda.LoggingFormat.JSON,
        architecture: lambda.Architecture.ARM_64,
        tracingConfig: lambda.TracingConfig.ACTIVE,
      });

      // Grant permission to read database secret
      props.dbSecret.grantRead(func);

      return func;
    };

    // ─────────────────────────────────────────────────────────────
    // Create one function per handler file
    // ─────────────────────────────────────────────────────────────
    this.getProductsFunction = createHandler(
      'GetProductsFunction',
      'src/handlers/products/getProducts.ts'
    );

    this.getProductByIdFunction = createHandler(
      'GetProductByIdFunction',
      'src/handlers/products/getProductById.ts'
    );

    this.createProductFunction = createHandler(
      'CreateProductFunction',
      'src/handlers/products/createProduct.ts'
    );

    this.getOrdersFunction = createHandler(
      'GetOrdersFunction',
      'src/handlers/orders/getOrders.ts'
    );

    this.createOrderFunction = createHandler(
      'CreateOrderFunction',
      'src/handlers/orders/createOrder.ts',
      cdk.Duration.seconds(60) // Orders need more time for transactions
    );

    this.createUserFunction = createHandler(
      'CreateUserFunction',
      'src/handlers/users/createUser.ts'
    );

    // ─────────────────────────────────────────────────────────────
    // Grant every Lambda permission to read the DB secret
    // (Already done above, but making it explicit)
    // ─────────────────────────────────────────────────────────────
    [
      this.getProductsFunction,
      this.getProductByIdFunction,
      this.createProductFunction,
      this.getOrdersFunction,
      this.createOrderFunction,
      this.createUserFunction,
    ].forEach((func) => {
      props.dbSecret.grantRead(func);
    });
  }
}
