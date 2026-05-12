import type { APIGatewayProxyEvent } from 'aws-lambda';

export function validateBody(event: APIGatewayProxyEvent): unknown | null {
  if (!event.body) {
    return null;
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
