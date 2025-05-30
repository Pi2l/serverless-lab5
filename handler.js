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

module.exports.sqsUserHandler = async (event) => {
  for (const record of event.Records) {
    console.log('Processing SQS message:', record);
    
    const body = JSON.parse(record.body);
    const eventType = body.eventType;
    switch (eventType) {
      case 'create':
        return createUser(body.body);
      case 'update':
        return updateUser(body.body);
      default:
        console.warn('Unknown event type:', eventType);
    }
  }
}

module.exports.sqsOrganizationHandler = async (event) => {
  for (const record of event.Records) {
    console.log('Processing SQS message:', record);

    const body = JSON.parse(record.body);
    const eventType = body.eventType;
    switch (eventType) {
      case 'create':
        return createOrganization(body.body);
      case 'update':
        return updateOrganization(body.body);
      default:
        console.warn('Unknown event type:', eventType);
    }
  }
}

const createOrganization = async (body) => {
  const { name, description } = body;
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

const updateOrganization = async (body) => {
  const { orgId } = body;

  try {
    const organization = await organizationService.updateOrganization(orgId, body);
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

const createUser = async (body) => {
  const { orgId, name, email } = body;

  try {
    const createdUser = await userService.createUser({ orgId, name, email });
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

const updateUser = async (body) => {
  const { orgId } = body;  

  try {
    const { email, name, userId } = body;
    const updatedUser = await userService.updateUser(orgId, { email, name, userId });
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
