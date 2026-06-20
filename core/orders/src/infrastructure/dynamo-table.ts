import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Table } from 'dynamodb-toolbox';

export type DynamoConfig = {
  tableName: string;
  region: string;
  endpoint?: string;
};

export function createOrdersTable(config: DynamoConfig) {
  const dynamoClient = new DynamoDBClient({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
  });
  const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const table = new Table({
    name: config.tableName,
    partitionKey: { name: 'PK', type: 'string' },
    sortKey: { name: 'SK', type: 'string' },
    indexes: {
      GSI1: {
        type: 'global',
        partitionKey: { name: 'GSI1PK', type: 'string' },
        sortKey: { name: 'GSI1SK', type: 'string' },
      },
    },
    documentClient,
  });
  return { table, documentClient };
}
