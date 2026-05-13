import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling, createApiError } from '../../middleware/errorHandler';
import { createdResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { withTransaction } from '../../db/client';
import { validateBody, validateRequired, validateUUID, validatePositive } from '../../middleware/validateBody';
import type { PoolClient } from 'pg';

interface OrderItem {
  product_id: string;
  quantity: number;
}

interface CreateOrderRequest {
  user_id: string;
  items: OrderItem[];
  shipping_address: Record<string, any>;
}

/**
 * POST /v1/orders
 * Places a new order, deducts stock atomically
 *
 * Uses a transaction to ensure:
 * 1. Order is created
 * 2. Order items are inserted
 * 3. Product stock is decremented
 * If any step fails, the entire order rolls back.
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const body = validateBody<CreateOrderRequest>(event);

  // Validate required fields
  validateRequired(body, ['user_id', 'items', 'shipping_address']);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw createApiError('Order must contain at least one item', 400);
  }

  // Validate UUIDs
  validateUUID(body.user_id, 'user_id');
  for (const item of body.items) {
    validateUUID(item.product_id, 'product_id');
    validatePositive(item.quantity, 'quantity');
  }

  logger.debug('Creating order', {
    userId: body.user_id,
    itemCount: body.items.length,
  });

  // Execute order creation within a transaction
  const result = await withTransaction(async (client: PoolClient) => {
    // Verify user exists
    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [
      body.user_id,
    ]);
    if (userResult.rows.length === 0) {
      throw createApiError('User not found', 404);
    }

    // Calculate total and verify stock for all items
    let totalAmount = 0;
    const itemsWithPrice: Array<OrderItem & { unit_price: number }> = [];

    for (const item of body.items) {
      const productResult = await client.query(
        `SELECT price, stock_quantity FROM products WHERE id = $1`,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw createApiError(`Product ${item.product_id} not found`, 404);
      }

      const product = productResult.rows[0];
      const unitPrice = product.price;

      if (product.stock_quantity < item.quantity) {
        throw createApiError(
          `Insufficient stock for product ${item.product_id}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`,
          409
        );
      }

      totalAmount += unitPrice * item.quantity;
      itemsWithPrice.push({
        ...item,
        unit_price: unitPrice,
      });
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount, shipping_address, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [
        body.user_id,
        'pending',
        totalAmount,
        JSON.stringify(body.shipping_address),
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items and decrement stock
    for (const item of itemsWithPrice) {
      // Insert order item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [orderId, item.product_id, item.quantity, item.unit_price]
      );

      // Decrement product stock
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    return { orderId, totalAmount };
  });

  logger.info('Order created successfully', {
    orderId: result.orderId,
    totalAmount: result.totalAmount,
  });

  return createdResponse(result);
};

export const handler = withErrorHandling(handlerFn);

