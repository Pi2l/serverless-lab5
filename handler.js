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

module.exports.createUser = async (event) => {
  const orgId = event.pathParameters.orgId;
  const { name, email } = JSON.parse(event.body);

  if (!(await isOrganizationExistsById(orgId))) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Organization not found' }),
    };
  }

  if (email && await isUserExistsByEmail(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User with this email already exists' }),
    };
  }

  if (!name && !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No fields to create' }),
    };
  }

  // create a new user
  const userId = uuidv4();
  const user = {
    userId,
    orgId,
    name,
    email,
  };
  console.log('Creating user:', user);
  await dynamoDb.send(new PutItemCommand({
    TableName: USER_TABLE,
    Item: {
      userId: { S: userId },
      orgId: { S: orgId },
      name: { S: name },
      email: { S: email }
    }
  }));
  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
}

module.exports.updateUser = async (event) => {
  const orgId = event.pathParameters.orgId;

  if (!(await isOrganizationExistsById(orgId))) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Organization not found' }),
    };
  }
  const { userId } = JSON.parse(event.body);
  const userFromDb = await getUserById(userId);
  console.log('userFromDb:', userFromDb);
  if (!userFromDb) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  if (userFromDb.orgId.S !== orgId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'User does not belong to this organization' }),
    };
  }

  // check if user with this email already exists
  const { name, email } = JSON.parse(event.body);
  if (email && email !== userFromDb.email.S && await isUserExistsByEmail(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User with this email already exists' }),
    };
  }
  if (!name && !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No fields to update' }),
    };
  }
  await dynamoDb.send(new PutItemCommand({
    TableName: USER_TABLE,
    Item: {
      userId: { S: userFromDb.userId.S },
      orgId: { S: orgId },
      name: { S: name ?? userFromDb.name.S },
      email: { S: email ?? userFromDb.email.S }
    },
    ConditionExpression: "attribute_exists(userId)"
  }));
  return {
    statusCode: 200,
    body: JSON.stringify({
      userId: userFromDb.userId.S,
      orgId,
      name: name ?? userFromDb.name.S,
      email: email ?? userFromDb.email.S
    }),
  };
}

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

async function isUserExistsByEmail(email) {
  const result = await dynamoDb.send(new QueryCommand({
    TableName: USER_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: "#email = :email",
    ExpressionAttributeNames: { "#email": "email" },
    ExpressionAttributeValues: { ":email": { S: email } },
  }));
  return result.Items && result.Items.length > 0;
}

async function getUserById(userId) {
  const result = await dynamoDb.send(new QueryCommand({
    TableName: USER_TABLE,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": { S: userId } },
    Limit: 1
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}  