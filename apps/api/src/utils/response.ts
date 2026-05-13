import type { APIGatewayProxyResult } from 'aws-lambda';

// ─────────────────────────────────────────────────────────────
// Standard API response shapes for all Lambda handlers
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
  details?: Record<string, any>;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Success response helper.
 * Returns HTTP 200-299 status with success:true and data payload.
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      data,
    } as ApiResponse<T>),
  };
}

/**
 * Error response helper.
 * Returns HTTP error status with success:false and error message.
 */
export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: Record<string, any>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error,
      ...(details && { details }),
    } as ApiErrorResponse),
  };
}

/**
 * Validation error response (400).
 */
export function validationError(
  message: string,
  details?: Record<string, string>
): APIGatewayProxyResult {
  return errorResponse(message, 400, details);
}

/**
 * Not found response (404).
 */
export function notFoundResponse(resource: string): APIGatewayProxyResult {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Conflict response (409) - typically for duplicate keys.
 */
export function conflictResponse(message: string): APIGatewayProxyResult {
  return errorResponse(message, 409);
}

/**
 * Created response (201) - for POST operations.
 */
export function createdResponse<T>(data: T): APIGatewayProxyResult {
  return successResponse(data, 201);
}

