import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends cdk.StackProps {
  getProductsFunction: lambda.Function;
  getProductByIdFunction: lambda.Function;
  createProductFunction: lambda.Function;
  getOrdersFunction: lambda.Function;
  createOrderFunction: lambda.Function;
  createUserFunction: lambda.Function;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────────────────────
    // REST API with CORS and throttling
    // ─────────────────────────────────────────────────────────────
    this.api = new apigateway.RestApi(this, 'EcommerceApi', {
      restApiName: 'ecommerce-api',
      description: 'E-commerce backend API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
      deployOptions: {
        stageName: 'v1',
        throttleSettings: {
          rateLimit: 10000, // requests per second
          burstLimit: 20000, // burst capacity
        },
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // ─────────────────────────────────────────────────────────────
    // Helper — wraps Lambda in a proxy integration
    // ─────────────────────────────────────────────────────────────
    const createLambdaIntegration = (
      handler: lambda.Function
    ): apigateway.LambdaIntegration => {
      return new apigateway.LambdaIntegration(handler, {
        proxy: true,
      });
    };

    // ─────────────────────────────────────────────────────────────
    // Route map — mount Lambda functions on API paths
    // ─────────────────────────────────────────────────────────────

    // /products
    const productsResource = this.api.root.addResource('products');

    // GET /products
    productsResource.addMethod(
      'GET',
      createLambdaIntegration(props.getProductsFunction),
      {
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '500' },
        ],
      }
    );

    // POST /products
    productsResource.addMethod(
      'POST',
      createLambdaIntegration(props.createProductFunction),
      {
        methodResponses: [
          { statusCode: '201' },
          { statusCode: '400' },
          { statusCode: '500' },
        ],
      }
    );

    // /products/{id}
    const productIdResource = productsResource.addResource('{id}');

    // GET /products/{id}
    productIdResource.addMethod(
      'GET',
      createLambdaIntegration(props.getProductByIdFunction),
      {
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '404' },
          { statusCode: '500' },
        ],
      }
    );

    // /orders
    const ordersResource = this.api.root.addResource('orders');

    // GET /orders
    ordersResource.addMethod(
      'GET',
      createLambdaIntegration(props.getOrdersFunction),
      {
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '400' },
          { statusCode: '500' },
        ],
      }
    );

    // POST /orders
    ordersResource.addMethod(
      'POST',
      createLambdaIntegration(props.createOrderFunction),
      {
        methodResponses: [
          { statusCode: '201' },
          { statusCode: '400' },
          { statusCode: '404' },
          { statusCode: '409' },
          { statusCode: '500' },
        ],
      }
    );

    // /users
    const usersResource = this.api.root.addResource('users');

    // POST /users
    usersResource.addMethod(
      'POST',
      createLambdaIntegration(props.createUserFunction),
      {
        methodResponses: [
          { statusCode: '201' },
          { statusCode: '400' },
          { statusCode: '409' },
          { statusCode: '500' },
        ],
      }
    );

    this.apiUrl = this.api.url;

    // ─────────────────────────────────────────────────────────────
    // Export the API URL
    // Paste into apps/frontend/.env.local as NEXT_PUBLIC_API_URL
    // ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway endpoint URL',
      exportName: 'EcommerceApiUrl',
    });

    new cdk.CfnOutput(this, 'ApiUrlForFrontend', {
      value: `${this.apiUrl}v1/`,
      description: 'API Gateway base URL for frontend (with v1 stage)',
      exportName: 'EcommerceApiUrlForFrontend',
    });
  }
}
