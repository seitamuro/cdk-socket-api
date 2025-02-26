import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import * as AWS from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  return await ddb
    .delete({
      TableName: process.env.TABLE_NAME || "",
      Key: {
        connectionId: event.requestContext.connectionId,
      },
    })
    .promise()
    .then(() => {
      return {
        statusCode: 200,
      };
    })
    .catch((e) => {
      console.log(e);
      return {
        statusCode: 500,
      };
    });
};
