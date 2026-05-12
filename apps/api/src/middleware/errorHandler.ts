import type { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiError extends Error {
  statusCode?: number;
}

export function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Error:', error);

  if (error instanceof Error) {
    const apiError = error as ApiError;
    const statusCode = apiError.statusCode || 500;
    return {
      statusCode,
      body: JSON.stringify({ error: apiError.message }),
    };
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}
