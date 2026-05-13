import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling } from '../../middleware/errorHandler';
import { successResponse, notFoundResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { query } from '../../db/client';
import { validatePathParams, validateUUID } from '../../middleware/validateBody';

/**
 * GET /v1/products/{id}
 * Returns one product by UUID
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const params = validatePathParams(event, ['id']);
  const productId = params.id;

  validateUUID(productId, 'product id');

  logger.debug('Fetching product by ID', { productId });

  const result = await query(
    `SELECT id, name, description, price, stock_quantity, image_url, is_active, created_at, updated_at
     FROM products
     WHERE id = $1 AND is_active = TRUE`,
    [productId]
  );

  if (result.length === 0) {
    logger.warn('Product not found', { productId });
    return notFoundResponse('Product');
  }

  logger.info('Product retrieved successfully', { productId });
  return successResponse(result[0]);
};

export const handler = withErrorHandling(handlerFn);
