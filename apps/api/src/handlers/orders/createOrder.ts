import type { APIGatewayProxyHandler } from 'aws-lambda';
import { validateOrder } from '@ecommerce/shared';
import { query } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);

    if (!validateOrder(body)) {
      return errorResponse('Invalid order data', 400);
    }

    const totalAmount = body.items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    const orderResult = await query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
      [body.userId, totalAmount, 'pending']
    );

    const orderId = orderResult[0].id;

    // Insert order items
    for (const item of body.items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    return successResponse({ orderId, totalAmount }, 201);
  } catch (error) {
    console.error('Error creating order:', error);
    return errorResponse('Failed to create order', 500);
  }
};
