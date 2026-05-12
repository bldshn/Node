-- ─────────────────────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- uuid-ossp gives us uuid_generate_v4() to auto-create UUIDs.
-- Always enable this before creating tables.


-- ─────────────────────────────────────────────────────────────
--  TABLE: users
--  Stores customer accounts. One row per registered user.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(320)  NOT NULL UNIQUE,
  full_name    VARCHAR(255),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- email VARCHAR(320): RFC 5321 max email length is 320 chars.
-- TIMESTAMPTZ: always store timestamps WITH timezone (UTC).


-- ─────────────────────────────────────────────────────────────
--  TABLE: products
--  The store catalogue. Independent of users.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE products (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(500)   NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER        NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url      TEXT,
  is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- NUMERIC(10,2): exact decimal — never use FLOAT for money.
-- CHECK (price >= 0): database-level guard, not just app-level.
-- is_active: soft-delete pattern — hide products without deleting.


-- ─────────────────────────────────────────────────────────────
--  TABLE: orders
--  A purchase made by a user. Contains shipping info + status.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL
                     REFERENCES users(id) ON DELETE CASCADE,
  status           order_status  NOT NULL DEFAULT 'pending',
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  shipping_address JSONB         NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ENUM for status: PostgreSQL enforces only valid values at DB level.
-- JSONB for shipping_address: flexible structure, queryable,
--   indexed. Better than 6 separate address columns.
-- ON DELETE CASCADE: deleting a user removes their orders too.


-- ─────────────────────────────────────────────────────────────
--  TABLE: order_items
--  Line items inside an order. Links orders ↔ products.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID           NOT NULL
                 REFERENCES orders(id)   ON DELETE CASCADE,
  product_id   UUID           NOT NULL
                 REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2)  NOT NULL CHECK (unit_price >= 0),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- unit_price is COPIED from products.price at order time.
-- This is intentional: if the product price changes later,
--   the historical order still shows what the customer paid.
-- ON DELETE RESTRICT on product_id: you cannot delete a product
--   that appears in any order. Protects order history integrity.


-- ─────────────────────────────────────────────────────────────
--  TRIGGER: auto-update updated_at on every row change
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- These triggers fire automatically on every UPDATE.
-- You never need to manually set updated_at in your Lambda code.


-- ─────────────────────────────────────────────────────────────
--  INDEXES — for query performance
-- ─────────────────────────────────────────────────────────────

-- users
CREATE UNIQUE INDEX idx_users_email
  ON users (email);

-- products
CREATE INDEX idx_products_is_active
  ON products (is_active);
CREATE INDEX idx_products_price
  ON products (price);

-- orders
CREATE INDEX idx_orders_user_id
  ON orders (user_id);
CREATE INDEX idx_orders_status
  ON orders (status);
CREATE INDEX idx_orders_created_at
  ON orders (created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order_id
  ON order_items (order_id);
CREATE INDEX idx_order_items_product_id
  ON order_items (product_id);

-- JSONB index on shipping_address for fast address lookups
CREATE INDEX idx_orders_shipping_gin
  ON orders USING GIN (shipping_address);
