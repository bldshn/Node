import type { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return errorResponse('userId query parameter is required', 400);
    }

    const orders = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [
      userId,
    ]);

    return successResponse(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return errorResponse('Failed to fetch orders', 500);
  }
};
