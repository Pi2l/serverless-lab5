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

module.exports.updateOrganization = async (event) => {
  const { orgId } = JSON.parse(event.body);

  if (!(await isOrganizationExistsById(orgId))) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Organization not found' }),
    };
  }

  const { name, description } = JSON.parse(event.body);
  const orgFromDb = await getOrganizationById(orgId);

  if (name && orgFromDb.name.S !== name && await isOrganizationExists(name)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Organization with this name already exists' }),
    };
  }

  if (!name && !description) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No fields to update' }),
    };
  }

  await dynamoDb.send(new PutItemCommand({
    TableName: ORGANIZATION_TABLE,
    Item: {
      orgId: { S: orgId },
      name: { S: name || undefined },
      description: { S: description || undefined }
    },
    ConditionExpression: "attribute_exists(orgId)"
  }));
  return {
    statusCode: 200,
    body: JSON.stringify({ orgId, name, description }),
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

async function isOrganizationExistsById(orgId) {
  const organization = await getOrganizationById(orgId);
  return organization !== null;
}
async function getOrganizationById(orgId) {
  const result = await dynamoDb.send(new QueryCommand({
    TableName: ORGANIZATION_TABLE,
    KeyConditionExpression: "orgId = :orgId",
    ExpressionAttributeValues: { ":orgId": { S: orgId } },
    Limit: 1
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}