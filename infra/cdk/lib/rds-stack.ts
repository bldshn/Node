import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class RdsStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    });

    this.database = new rds.DatabaseInstance(this, 'EcommerceDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      vpc,
      databaseName: 'ecommerce',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      multiAz: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, 'DBEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      exportName: 'EcommerceDBEndpoint',
    });
  }
}
