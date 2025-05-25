// check-table.js
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: 'eu-west-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

async function checkTable(tableName) {
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  console.log(`Table "${tableName}" has ${result.Count} items.`);
  console.log(result.Items);
}

checkTable('organizations');
checkTable('users');