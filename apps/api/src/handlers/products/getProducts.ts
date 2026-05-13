import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling } from '../../middleware/errorHandler';
import { successResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { query } from '../../db/client';

/**
 * GET /v1/products
 * Returns all active products
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.debug('Fetching all active products');

  const products = await query(
    `SELECT id, name, description, price, stock_quantity, image_url, is_active, created_at, updated_at
     FROM products
     WHERE is_active = TRUE
     ORDER BY created_at DESC`
  );

  logger.info(`Retrieved ${products.length} products`);

  return successResponse(products);
};

export const handler = withErrorHandling(handlerFn);



