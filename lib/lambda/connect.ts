import * as AWS from "aws-sdk";

export async function handler(event: any): Promise<any> {
  const client = new AWS.DynamoDB.DocumentClient();

  const result = await client
    .put({
      TableName: process.env.TABLE_NAME || "",
      Item: {
        connectionId: event.requestContext.connectionId,
      },
    })
    .promise();

  return {
    statusCode: 200,
    body: "onConnect",
  };
}
