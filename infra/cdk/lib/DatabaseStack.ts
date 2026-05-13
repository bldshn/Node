import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly database: rds.DatabaseInstance;
  public readonly rdsProxy: rds.DatabaseProxy;
  public readonly rdsProxyEndpoint: string;
  public readonly dbSecret: secrets.Secret;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: DatabaseStackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────────────────────
    // 1. VPC — isolates the DB from the public internet
    // ─────────────────────────────────────────────────────────────
    this.vpc = new ec2.Vpc(this, 'EcommerceVpc', {
      maxAzs: 2,
      natGateways: 1,
      cidrMask: 24,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 26,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 26,
        },
      ],
    });

    // ─────────────────────────────────────────────────────────────
    // 2. DB credentials stored in Secrets Manager
    // (Lambda reads these at runtime, never in env vars)
    // ─────────────────────────────────────────────────────────────
    this.dbSecret = new secrets.Secret(this, 'EcommerceDbSecret', {
      secretName: 'ecommerce/db',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'ecommerce_app',
        }),
        generateStringKey: 'password',
        passwordLength: 32,
        excludeCharacters: '"\'\\',
      },
    });

    // ─────────────────────────────────────────────────────────────
    // 3. RDS PostgreSQL 15 instance
    // (Multi-AZ disabled for MVP — enable for production)
    // ─────────────────────────────────────────────────────────────
    this.database = new rds.DatabaseInstance(this, 'EcommerceDb', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      databaseName: 'ecommerce',
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      multiAz: false, // Set to true for production
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      enableCloudwatchLogsExports: ['postgresql'],
      enableIamAuthentication: false, // Set to true for enhanced security
      enableStorageEncryption: true,
      autoMinorVersionUpgrade: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────
    // 4. RDS Proxy — THE connection pooling solution for Lambda
    // Multiplexes Lambda connections onto far fewer RDS connections
    // ─────────────────────────────────────────────────────────────
    this.rdsProxy = this.database.addProxy('EcommerceProxy', {
      borrowTimeout: cdk.Duration.seconds(30),
      maxIdleConnections: 5,
      maxConnectionsPercent: 100,
      sessionPinningFilters: [
        rds.SessionPinningFilter.EXCLUDE_ALL,
      ],
      requireTls: false, // Set to true for production
    });

    this.rdsProxyEndpoint = this.rdsProxy.endpoint;

    // ─────────────────────────────────────────────────────────────
    // 5. Security group for Lambda functions
    // Allows Lambda to reach RDS Proxy
    // ─────────────────────────────────────────────────────────────
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Allow Lambda security group to connect to RDS Proxy
    this.rdsProxy.grantConnect(this.lambdaSecurityGroup, this.dbSecret.secretValueFromJson('username'));

    // ─────────────────────────────────────────────────────────────
    // 6. Outputs — visible in CloudFormation console & CDK output
    // ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'RdsProxyEndpoint', {
      value: this.rdsProxyEndpoint,
      description: 'RDS Proxy endpoint for Lambda',
      exportName: 'EcommerceRdsProxyEndpoint',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'ARN of database secret in Secrets Manager',
      exportName: 'EcommerceDbSecretArn',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'EcommerceVpcId',
    });
  }
}
