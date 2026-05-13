import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling, createApiError } from '../../middleware/errorHandler';
import { createdResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { query } from '../../db/client';
import { validateBody, validateRequired, validatePositive, validateEmail } from '../../middleware/validateBody';

interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
}

/**
 * POST /v1/products
 * Creates a new product
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const body = validateBody<CreateProductRequest>(event);

  // Validate required fields
  validateRequired(body, ['name', 'price', 'stock_quantity']);

  // Validate price and stock
  const price = validatePositive(body.price, 'price');
  const stockQuantity = validatePositive(body.stock_quantity, 'stock_quantity');

  logger.debug('Creating new product', {
    name: body.name,
    price,
    stockQuantity,
  });

  const result = await query(
    `INSERT INTO products (name, description, price, stock_quantity, image_url, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
     RETURNING id, name, description, price, stock_quantity, image_url, is_active, created_at, updated_at`,
    [body.name, body.description || null, price, stockQuantity, body.image_url || null]
  );

  const product = result[0];
  logger.info('Product created successfully', { productId: product.id });

  return createdResponse(product);
};

export const handler = withErrorHandling(handlerFn);

