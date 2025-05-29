const { PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const ClientErrorException = require('../exception/client-error-exception');

class OrganizationService {
  static ORGANIZATION_TABLE = process.env.ORGANIZATION_TABLE || 'organizations';

  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  async createOrganization(organization) {
    const { name, description } = organization;

    if (await this.isOrganizationExists(name)) {
      throw new ClientErrorException(400, 'Organization already exists');
    }

    // create a new organization
    const organizationId = uuidv4();
    const organizationToCreate = {
      orgId: organizationId,
      name,
      description,
    };

    console.log('Creating organization:', organizationToCreate);

    await this.dynamoDb.send(new PutItemCommand({
      TableName: OrganizationService.ORGANIZATION_TABLE,
      Item: {
        orgId: { S: organizationId },
        name: { S: name },
        description: { S: description }
      }
    }));
    return organizationToCreate;
  }

  async updateOrganization(orgId, organization) {
    if (!(await this.isOrganizationExistsById(orgId))) {
      throw new ClientErrorException(404, 'Organization not found');
    }

    const { name, description } = organization;
    const orgFromDb = await this.getOrganizationById(orgId);

    if (name && orgFromDb.name.S !== name && await this.isOrganizationExists(name)) {
      throw new ClientErrorException(400, 'Organization with this name already exists');
    }

    if (!name && !description) {
      throw new ClientErrorException(400, 'No fields to update');
    }

    await this.dynamoDb.send(new PutItemCommand({
      TableName: OrganizationService.ORGANIZATION_TABLE,
      Item: {
        orgId: { S: orgId },
        name: { S: name || undefined },
        description: { S: description || undefined }
      },
      ConditionExpression: "attribute_exists(orgId)"
    }));

    return {
      orgId,
      name: name || orgFromDb.name.S,
      description: description || orgFromDb.description.S
    };
  }

  async isOrganizationExists(name) {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: OrganizationService.ORGANIZATION_TABLE,
      IndexName: 'name-index',
      KeyConditionExpression: "#name = :name",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":name": { S: name } }, 
    }));
    return result.Items && result.Items.length > 0;
  }

  async isOrganizationExistsById(orgId) {
    const organization = await this.getOrganizationById(orgId);
    return organization !== null;
  }

  async getOrganizationById(orgId) {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: OrganizationService.ORGANIZATION_TABLE,
      KeyConditionExpression: "orgId = :orgId",
      ExpressionAttributeValues: { ":orgId": { S: orgId } },
      Limit: 1
    }));

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }
}

module.exports = OrganizationService;