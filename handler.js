const { DynamoDBClient, QueryCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new DynamoDBClient({
  region: 'eu-west-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const ORGANIZATION_TABLE = 'organizations';
const USER_TABLE = 'users';


module.exports.createOrganization = async (event) => {
  const { name, description } = JSON.parse(event.body);

  if (await isOrganizationExists(name)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Organization already exists' }),
    };
  }
  // create a new organization
  const organizationId = uuidv4();
  const organization = {
    orgId: organizationId,
    name,
    description,
  };

  console.log('Creating organization:', organization);

  await dynamoDb.send(new PutItemCommand({
    TableName: ORGANIZATION_TABLE,
    Item: {
      orgId: { S: organizationId },
      name: { S: name },
      description: { S: description }
    }
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(organization),
  };
};


async function isOrganizationExists(name) {
  const result = await dynamoDb.send(new QueryCommand({
    TableName: ORGANIZATION_TABLE,
    IndexName: 'name-index',
    KeyConditionExpression: "#name = :name",
    ExpressionAttributeNames: { "#name": "name" },
    ExpressionAttributeValues: { ":name": { S: name } }, 
  }));
  return result.Items && result.Items.length > 0;
}