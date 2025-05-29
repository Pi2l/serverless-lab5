const { DynamoDBClient, QueryCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const UserService = require('./service/user-service');
const OrganizationService = require('./service/organization-service');

const dynamoDb = new DynamoDBClient({
  region: 'eu-west-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const organizationService = new OrganizationService(dynamoDb);
const userService = new UserService(dynamoDb, organizationService);

module.exports.createOrganization = async (event) => {
  const { name, description } = JSON.parse(event.body);
  let organization;

  try {
    organization = await organizationService.createOrganization({ name, description });
  } catch (error) {
    console.error('Error creating organization:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(organization),
  };
};

module.exports.updateOrganization = async (event) => {
  const { orgId } = JSON.parse(event.body);

  try {
    const organization = await organizationService.updateOrganization(orgId, JSON.parse(event.body));
    return {
      statusCode: 200,
      body: JSON.stringify(organization),
    };
  } catch (error) {
    console.error('Error updating organization:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};

module.exports.createUser = async (event) => {
  const orgId = event.pathParameters.orgId;
  const { name, email } = JSON.parse(event.body);
  const user = {
    orgId,
    name,
    email,
  };

  try {
    const createdUser = await userService.createUser(user);
    return {
      statusCode: 200,
      body: JSON.stringify(createdUser),
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
  
}

module.exports.updateUser = async (event) => {
  const orgId = event.pathParameters.orgId;

  try {
    const user = JSON.parse(event.body);
    const updatedUser = await userService.updateUser(orgId, user);
    return {
      statusCode: 200,
      body: JSON.stringify(updatedUser),
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
}
