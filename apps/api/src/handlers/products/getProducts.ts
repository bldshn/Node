import type { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const products = await query('SELECT * FROM products');
    return successResponse(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return errorResponse('Failed to fetch products', 500);
  }
};
