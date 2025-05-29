const { PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const ClientErrorException = require('../exception/client-error-exception');

class UserService {
  static USER_TABLE = process.env.USER_TABLE || 'users';

  constructor(dynamoDb, organizationService) {
    this.dynamoDb = dynamoDb;
    this.organizationService = organizationService;
  }

  async createUser(user) {
    const { name, email, orgId } = user;

    if (!(await this.organizationService.isOrganizationExistsById(orgId))) {
      throw new ClientErrorException(404, 'Organization not found');
    }

    if (email && await this.isUserExistsByEmail(email)) {
      throw new ClientErrorException(400, 'User with this email already exists');
    }

    if (!name && !email) {
      throw new ClientErrorException(400, 'No fields to create');
    }

    // create a new user
    const userId = uuidv4();
    console.log('Creating user:', userId, orgId, name, email);
    await this.dynamoDb.send(new PutItemCommand({
      TableName: UserService.USER_TABLE,
      Item: {
        userId: { S: userId },
        orgId: { S: orgId },
        name: { S: name },
        email: { S: email }
      }
    }));
    return {
      userId,
      orgId,
      name,
      email,
    };
  }

  async updateUser(orgId, user) {
    if (!(await this.organizationService.isOrganizationExistsById(orgId))) {
      throw new ClientErrorException(404, 'Organization not found');
    }
    const { userId } = user;
    const userFromDb = await this.getUserById(userId);
    console.log('userFromDb:', userFromDb);
    if (!userFromDb) {
      throw new ClientErrorException(404, 'User not found');
    }

    if (userFromDb.orgId.S !== orgId) {
      throw new ClientErrorException(403, 'User does not belong to this organization');
    }

    // check if user with this email already exists
    const { name, email } = user;
    if (email && email !== userFromDb.email.S && await this.isUserExistsByEmail(email)) {
      throw new ClientErrorException(400, 'User with this email already exists');
    }
    if (!name && !email) {
      throw new ClientErrorException(400, 'No fields to update');
    }
    await this.dynamoDb.send(new PutItemCommand({
      TableName: UserService.USER_TABLE,
      Item: {
        userId: { S: userFromDb.userId.S },
        orgId: { S: orgId },
        name: { S: name ?? userFromDb.name.S },
        email: { S: email ?? userFromDb.email.S }
      },
      ConditionExpression: "attribute_exists(userId)"
    }));

    return {
      userId: userFromDb.userId.S,
      orgId: orgId,
      name: name ?? userFromDb.name.S,
      email: email ?? userFromDb.email.S
    };
  }

  async isUserExistsByEmail(email) {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: UserService.USER_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: "#email = :email",
      ExpressionAttributeNames: { "#email": "email" },
      ExpressionAttributeValues: { ":email": { S: email } },
    }));
    return result.Items && result.Items.length > 0;
  }

  async getUserById(userId) {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: UserService.USER_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": { S: userId } },
      Limit: 1
    }));

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }
}

module.exports = UserService;