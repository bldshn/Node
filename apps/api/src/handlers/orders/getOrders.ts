import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling } from '../../middleware/errorHandler';
import { successResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { query } from '../../db/client';
import { validateQueryParams, validateUUID } from '../../middleware/validateBody';

/**
 * GET /v1/orders?user_id={id}
 * Returns orders for a user
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const params = validateQueryParams(event, ['user_id']);
  const userId = params.user_id;

  validateUUID(userId, 'user_id');

  logger.debug('Fetching orders for user', { userId });

  // Fetch orders
  const orders = await query(
    `SELECT id, user_id, status, total_amount, shipping_address, created_at, updated_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  // Fetch order items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order: any) => {
      const items = await query(
        `SELECT id, order_id, product_id, quantity, unit_price, created_at
         FROM order_items
         WHERE order_id = $1`,
        [order.id]
      );
      return {
        ...order,
        items,
      };
    })
  );

  logger.info(`Retrieved ${ordersWithItems.length} orders for user`, { userId });

  return successResponse(ordersWithItems);
};

export const handler = withErrorHandling(handlerFn);

