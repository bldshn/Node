import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.api = new apigateway.RestApi(this, 'EcommerceAPI', {
      description: 'Ecommerce REST API',
      deployOptions: {
        stageName: 'prod',
      },
    });

    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      exportName: 'EcommerceAPIEndpoint',
    });
  }
}

