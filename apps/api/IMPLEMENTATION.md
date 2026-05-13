# AWS Lambda Backend - Phase 3 Implementation

## Architecture Overview

This backend implements a serverless e-commerce API using AWS Lambda, API Gateway, and PostgreSQL/RDS Proxy. Each endpoint maps to a dedicated Lambda function with shared database connectivity and middleware.

### Critical: Connection Pool Singleton Pattern

**The DB connection pool is instantiated OUTSIDE the Lambda handler function.** This ensures it persists across warm invocations, preventing connection exhaustion under load.

- **Cold start**: Pool created once, stays in memory
- **Warm invocation**: Pool reused from previous execution
- **Result**: 5 connections per Lambda × 50 concurrent instances = 250 total connections, which RDS Proxy multiplexes to far fewer actual DB connections

## Environment Configuration

### `.env` File
All database secrets are passed via environment variables. In production, these come from AWS Secrets Manager.

```bash
DB_HOST=localhost              # RDS Proxy endpoint in production
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MAX=5                  # Connections per Lambda instance
NODE_ENV=production
LOG_LEVEL=INFO                 # DEBUG, INFO, WARN, ERROR
```

## Database Connection

### `src/db/client.ts` - The Singleton Pool

```typescript
// Module-level pool - created once on cold start
export let pool: Pool;

export function getPool(): Pool {
  return pool || initializePool();
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  // Transactions automatically rollback on error
}
```

**Why this matters:**
- Creating pool inside handler = new connections every invocation = exhausted connections
- Creating pool outside handler = reused connection pool = efficient resource usage

## Shared Utilities

### Response Helpers (`src/utils/response.ts`)

```typescript
// Standardized response shapes for all endpoints
successResponse(data, 200)          // 200-299 responses
errorResponse(message, 500)         // Error responses
validationError(message, details)   // 400 Bad Request
notFoundResponse(resource)          // 404 Not Found
conflictResponse(message)           // 409 Conflict
createdResponse(data)               // 201 Created
```

### Structured Logging (`src/utils/logger.ts`)

CloudWatch-optimized JSON logging with context:
```typescript
logger.info('Order created', { orderId: '...', totalAmount: 99.99 })
// Outputs: {"level":"INFO","message":"...","requestId":"...","timestamp":"2026-05-13T..."}
```

## Middleware

### Error Handler with `withErrorHandling()`

All handlers must be wrapped with this HOF. It:
- Catches all errors and returns proper API responses
- Logs errors to CloudWatch with full context
- Sets request context (ID, endpoint, source IP)
- Clears context after handler completes

```typescript
const handler = async (event, context) => {
  // handler logic - throw errors and they're caught automatically
};

export const handler = withErrorHandling(handler);
```

### Request Validation (`src/middleware/validateBody.ts`)

```typescript
validateBody<T>(event)                    // Extract & parse JSON body
validateQueryParams(event, ['user_id'])   // Validate query strings
validatePathParams(event, ['id'])         // Validate path params
validateRequired(obj, ['field1', 'field2']) // Check required fields
validateUUID(value)                       // Validate UUID format
validateEmail(email)                      // Validate email
validatePositive(value)                   // Validate positive number
```

All validation throws `ApiError` which is caught by `withErrorHandling()` and converted to proper responses.

## API Endpoints

### Products

#### GET `/v1/products`
Returns all active products, ordered by creation date (newest first).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Wireless Headphones",
      "description": "Premium noise-cancelling headphones",
      "price": "199.99",
      "stock_quantity": 42,
      "image_url": "https://...",
      "is_active": true,
      "created_at": "2026-05-13T10:00:00Z",
      "updated_at": "2026-05-13T10:00:00Z"
    }
  ]
}
```

#### GET `/v1/products/{id}`
Returns a single product by UUID.

**Response:** Single product object (same as above) or 404 if not found.

#### POST `/v1/products`
Creates a new product.

**Request:**
```json
{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "price": 49.99,
  "stock_quantity": 100,
  "image_url": "https://..."
}
```

**Validation:**
- `name` (required): string
- `price` (required): positive number
- `stock_quantity` (required): positive integer
- `description`, `image_url`: optional strings

**Response:** Created product object, HTTP 201.

### Orders

#### GET `/v1/orders?user_id={id}`
Returns all orders for a user with their line items.

**Query Parameters:**
- `user_id` (required): UUID of the user

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "user_id": "...",
      "status": "pending",
      "total_amount": "299.98",
      "shipping_address": { ... },
      "created_at": "...",
      "updated_at": "...",
      "items": [
        {
          "id": "...",
          "product_id": "...",
          "quantity": 2,
          "unit_price": "149.99",
          "created_at": "..."
        }
      ]
    }
  ]
}
```

#### POST `/v1/orders`
Creates a new order and atomically decrements product stock.

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "product_id": "660e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "USA"
  }
}
```

**Validation:**
- `user_id` (required): valid UUID
- `items` (required): non-empty array
  - `product_id`: valid UUID
  - `quantity`: positive integer
- `shipping_address` (required): object

**Transaction Logic:**
1. Verify user exists → 404 if not
2. For each item:
   - Verify product exists → 404 if not
   - Check stock ≥ quantity → 409 if insufficient
   - Fetch unit_price from product
3. Create order with calculated total
4. Insert order items
5. Decrement product stock for each item
6. **If any step fails, entire transaction rolls back**

**Response:** `{ orderId, totalAmount }`, HTTP 201.

### Users

#### POST `/v1/users`
Registers a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

**Validation:**
- `email` (required): valid email format, unique
- `full_name` (optional): string

**Response:** Created user object, HTTP 201.

**Error Handling:**
- Duplicate email → 409 Conflict

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Product not found",
  "statusCode": 404,
  "details": { ... }  // Optional additional context
}
```

**Common Status Codes:**
- `400` Bad Request - validation failed
- `404` Not Found - resource doesn't exist
- `409` Conflict - duplicate/stock conflict
- `500` Internal Server Error - unexpected error

## Database Schema

### Tables

**users**
- `id` (UUID, PK)
- `email` (VARCHAR 320, UNIQUE)
- `full_name` (VARCHAR 255)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**products**
- `id` (UUID, PK)
- `name` (VARCHAR 500)
- `description` (TEXT)
- `price` (NUMERIC 10,2)
- `stock_quantity` (INTEGER)
- `image_url` (TEXT)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**orders**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `status` (ENUM: pending, confirmed, shipped, delivered, cancelled)
- `total_amount` (NUMERIC 12,2)
- `shipping_address` (JSONB)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**order_items**
- `id` (UUID, PK)
- `order_id` (UUID, FK → orders)
- `product_id` (UUID, FK → products)
- `quantity` (INTEGER)
- `unit_price` (NUMERIC 10,2) - snapshot of price at order time
- `created_at` (TIMESTAMPTZ)

### Triggers & Indexes

- **Trigger** `set_updated_at()`: Automatically updates `updated_at` on any row change
- **Indexes**: On `email`, `user_id`, `status`, `product_id`, `is_active` for query performance
- **JSONB Index** on `shipping_address` for fast lookups

## Testing

### Local Setup

```bash
# Install dependencies
cd apps/api
pnpm install

# Start PostgreSQL locally
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Create database and run migrations
psql -U postgres -h localhost -f ../../apps/backend/src/database/001-create-tables.sql

# Start serverless offline
pnpm dev
```

### Example cURL Requests

**Create a product:**
```bash
curl -X POST http://localhost:3000/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 999.99,
    "stock_quantity": 10
  }'
```

**Get all products:**
```bash
curl http://localhost:3000/v1/products
```

**Create a user:**
```bash
curl -X POST http://localhost:3000/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "full_name": "Jane Doe"
  }'
```

**Create an order:**
```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "product_id": "660e8400-e29b-41d4-a716-446655440000",
        "quantity": 2
      }
    ],
    "shipping_address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    }
  }'
```

## Production Deployment

### AWS Secrets Manager

Store database credentials in Secrets Manager. Lambda's execution role has permission to fetch them.

### RDS Proxy

Use RDS Proxy in front of your RDS instance to multiplex the 250 Lambda connections (5 × 50 instances) into far fewer actual database connections.

### Environment Variables (Lambda)

Set in serverless.yml or via CloudFormation:
- `DB_HOST`: RDS Proxy endpoint
- `DB_PORT`: 5432
- `DB_NAME`: ecommerce
- `DB_USER`: From Secrets Manager
- `DB_PASSWORD`: From Secrets Manager
- `DB_POOL_MAX`: 5 (tuned for Lambda)

### Monitoring

All errors and important events are logged to CloudWatch in JSON format:
```json
{"level":"ERROR","message":"...","requestId":"aws-request-id","timestamp":"...","errorStack":"..."}
```

Use CloudWatch Insights to query logs:
```
fields @timestamp, message, level, error
| stats count() by level
| sort level
```

## Phase 3 Completion Checklist

- ✅ Singleton connection pool (module-level, reused across warm invocations)
- ✅ All 6 Lambda handlers with error handling
- ✅ Transaction support for order creation
- ✅ Stock deduction atomically within transactions
- ✅ Request validation middleware
- ✅ Structured CloudWatch logging
- ✅ Standard error responses
- ✅ Database schema with triggers and indexes
- ✅ Serverless configuration with all endpoints

## Next: Phase 4

Implement the Next.js frontend to consume these APIs.
