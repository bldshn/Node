import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandling, createApiError } from '../../middleware/errorHandler';
import { createdResponse, conflictResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { query } from '../../db/client';
import { validateBody, validateRequired, validateEmail } from '../../middleware/validateBody';

interface CreateUserRequest {
  email: string;
  full_name?: string;
}

/**
 * POST /v1/users
 * Registers a new user account
 */
const handlerFn = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const body = validateBody<CreateUserRequest>(event);

  // Validate required fields
  validateRequired(body, ['email']);

  // Validate email format
  validateEmail(body.email);

  logger.debug('Creating new user', {
    email: body.email,
  });

  try {
    const result = await query(
      `INSERT INTO users (email, full_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, full_name, created_at, updated_at`,
      [body.email, body.full_name || null]
    );

    const user = result[0];
    logger.info('User created successfully', { userId: user.id });

    return createdResponse(user);
  } catch (error: any) {
    // Handle duplicate email
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      logger.warn('User creation failed: email already exists', { email: body.email });
      return conflictResponse(`User with email ${body.email} already exists`);
    }

    throw error;
  }
};

export const handler = withErrorHandling(handlerFn);

