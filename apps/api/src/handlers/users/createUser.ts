import type { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);

    if (!body.email || !body.name) {
      return errorResponse('Email and name are required', 400);
    }

    const result = await query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at',
      [body.email, body.name]
    );

    return successResponse(result[0], 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return errorResponse('Failed to create user', 500);
  }
};
