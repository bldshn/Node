import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/response';

// ─────────────────────────────────────────────────────────────
// Global error boundary for Lambda handlers.
// All handlers should be wrapped with withErrorHandling.
// ─────────────────────────────────────────────────────────────

export interface ApiError extends Error {
  statusCode?: number;
  details?: Record<string, any>;
}

/**
 * Create an ApiError with a specific status code.
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  details?: Record<string, any>
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

/**
 * Wrap a Lambda handler with global error handling.
 * Catches all errors and returns properly formatted error responses.
 * Logs all errors to CloudWatch.
 *
 * Usage:
 *   export const handler = withErrorHandling(async (event, context) => {
 *     // handler logic
 *   });
 */
export function withErrorHandling(
  handler: (
    event: APIGatewayProxyEvent,
    context: Context
  ) => Promise<APIGatewayProxyResult>
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    // Set up logging context
    logger.setContext({
      requestId: context.awsRequestId,
      endpoint: `${event.httpMethod} ${event.path}`,
      sourceIp: event.requestContext.identity.sourceIp,
    });

    logger.info(`Incoming ${event.httpMethod} ${event.path}`);

    try {
      const result = await handler(event, context);
      logger.info('Handler completed successfully', {
        statusCode: result.statusCode,
      });
      return result;
    } catch (error) {
      // Determine status code
      let statusCode = 500;
      let message = 'Internal server error';
      let details: Record<string, any> | undefined;

      if (error instanceof Error) {
        const apiError = error as ApiError;
        statusCode = apiError.statusCode || 500;
        message = apiError.message;
        details = apiError.details;

        logger.error(`Handler error: ${message}`, error);
      } else if (typeof error === 'object' && error !== null) {
        logger.error('Handler error: Unknown error object', error);
      } else {
        logger.error(`Handler error: ${String(error)}`);
      }

      return errorResponse(message, statusCode, details);
    } finally {
      logger.clearContext();
    }
  };
}

