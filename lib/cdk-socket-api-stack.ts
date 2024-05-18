import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkSocketApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webSocketBucket = new s3.Bucket(this, "WebSocketBucket");

    const webSocketConnection = new dynamodb.Table(
      this,
      "webSocketConnection",
      {
        partitionKey: {
          name: "connectionId",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: "webSocketConnection",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const api = new apigatewayv2.WebSocketApi(this, "WebSocketApi", {
      apiName: "WebSocketApi",
      routeSelectionExpression: "$request.body.action",
    });

    const connectLambda = new lambda.Function(this, "web-socket-connect", {
      code: new lambda.AssetCode("lib/lambda"),
      handler: "connect.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        TABLE_NAME: webSocketConnection.tableName,
        TABLE_KEY: "connectionId",
      },
    });
    webSocketConnection.grantWriteData(connectLambda);

    const defaultLambda = new lambda.Function(this, "web-socket-default", {
      code: new lambda.AssetCode("lib/lambda"),
      handler: "default.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        TABLE_NAME: webSocketConnection.tableName,
        TABLE_KEY: "connectionId",
      },
    });

    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [connectLambda.functionArn],
      actions: ["lambda:InvokeFunction"],
    });

    const role = new iam.Role(this, `${api.webSocketApiName}-iam-role`, {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // $connect
    const connectIntegration = new integrations.WebSocketLambdaIntegration(
      "connect-lambda-connectIntegration",
      connectLambda
    );
    api.addRoute("$connect", {
      integration: connectIntegration,
    });

    // $default
    api.grantManageConnections(defaultLambda);
    const defaultIntegration = new integrations.WebSocketLambdaIntegration(
      "default-lambda-defaultIntegration",
      defaultLambda
    );
    api.addRoute("$default", {
      integration: defaultIntegration,
    });

    // deploy apigateway
    const stage = new apigatewayv2.WebSocketStage(this, "WebSocketProd", {
      webSocketApi: api,
      stageName: "prod",
      autoDeploy: true,
    });
    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: `${stage.api.apiEndpoint}/${stage.stageName}/`,
    });

    /*const deployment = new apigatewayv2.CfnDeployment(
      this,
      `${api.webSocketApiName}-deployment`,
      {
        apiId: api.apiId,
      }
    );
    deployment.addDependency(connectionRoute);

    const stage = new apigatewayv2.CfnStage(
      this,
      `${api.webSocketApiName}-stage`,
      {
        apiId: api.apiId,
        autoDeploy: true,
        deploymentId: deployment.ref,
        stageName: "prod",
      }
    );*/
  }
}
