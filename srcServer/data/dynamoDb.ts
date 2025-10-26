import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


const accessKeyId: string = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey: string = process.env.AWS_SECRET_ACCESS_KEY || '';
const tableName: string = process.env.TABLE_NAME || '';



const client: DynamoDBClient = new DynamoDBClient({
  region: "eu-north-1",
  credentials: {
	accessKeyId: accessKeyId!,
	secretAccessKey: secretAccessKey!,
  },
});

const db: DynamoDBDocumentClient = DynamoDBDocumentClient.from(client);




export { db, tableName };