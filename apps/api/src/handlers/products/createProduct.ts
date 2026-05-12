import type { APIGatewayProxyHandler } from 'aws-lambda';
import { validateProduct } from '@ecommerce/shared';
import { query } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);

    if (!validateProduct(body)) {
      return errorResponse('Invalid product data', 400);
    }

    const result = await query(
      'INSERT INTO products (name, description, price, inventory, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [body.name, body.description, body.price, body.inventory, body.imageUrl]
    );

    return successResponse(result[0], 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return errorResponse('Failed to create product', 500);
  }
};
