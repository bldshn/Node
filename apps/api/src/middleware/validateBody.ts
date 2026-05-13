import type { APIGatewayProxyEvent } from 'aws-lambda';
import { createApiError } from './errorHandler';

// ─────────────────────────────────────────────────────────────
// Request validation middleware
// ─────────────────────────────────────────────────────────────

/**
 * Extract and validate request body.
 * Throws ApiError if body is missing or invalid JSON.
 */
export function validateBody<T = any>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw createApiError('Request body is required', 400);
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw createApiError('Invalid JSON in request body', 400);
  }
}

/**
 * Extract and validate query string parameters.
 * Throws ApiError if required parameters are missing.
 */
export function validateQueryParams(
  event: APIGatewayProxyEvent,
  required: string[]
): Record<string, string> {
  const params = event.queryStringParameters || {};

  const missing = required.filter((param) => !params[param]);
  if (missing.length > 0) {
    throw createApiError(
      `Missing required query parameters: ${missing.join(', ')}`,
      400,
      { missing }
    );
  }

  return params;
}

/**
 * Extract and validate path parameters.
 * Throws ApiError if required parameters are missing.
 */
export function validatePathParams(
  event: APIGatewayProxyEvent,
  required: string[]
): Record<string, string> {
  const params = event.pathParameters || {};

  const missing = required.filter((param) => !params[param]);
  if (missing.length > 0) {
    throw createApiError(
      `Missing required path parameters: ${missing.join(', ')}`,
      400,
      { missing }
    );
  }

  return params;
}

/**
 * Validate that an object has required fields.
 * Throws ApiError if any field is missing.
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter((field) => !obj[field]);

  if (missing.length > 0) {
    throw createApiError(
      `Missing required fields: ${String(missing.join(', '))}`,
      400,
      { missing: missing.map(String) }
    );
  }
}

/**
 * Validate that a string is a valid UUID.
 */
export function validateUUID(value: string, fieldName: string = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw createApiError(`Invalid ${fieldName} format: must be a valid UUID`, 400);
  }
}

/**
 * Validate that a value is a positive number.
 */
export function validatePositive(value: any, fieldName: string = 'value'): number {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw createApiError(`${fieldName} must be a positive number`, 400);
  }
  return num;
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createApiError('Invalid email format', 400);
  }
}

