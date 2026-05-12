import type { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function successResponse<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

export function errorResponse(error: string, statusCode: number = 500): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: false,
      error,
    }),
  };
}
