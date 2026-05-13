import type { Product, Order, CreateOrderInput } from '@ecommerce/shared';

const USE_MOCK = true; // ← flip to false when backend is live
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Mock data ─────────────────────────────────────────────────
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1a2b3c4d-0001-0000-0000-000000000001',
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium sound with 30-hour battery life.',
    price: 79.99,
    stock_quantity: 42,
    image_url: 'https://placehold.co/400x400?text=Headphones',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '1a2b3c4d-0002-0000-0000-000000000002',
    name: 'Mechanical Keyboard',
    description: 'Tactile switches, RGB backlight, TKL layout.',
    price: 129.99,
    stock_quantity: 18,
    image_url: 'https://placehold.co/400x400?text=Keyboard',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '1a2b3c4d-0003-0000-0000-000000000003',
    name: 'USB-C Hub 7-in-1',
    description: 'HDMI 4K, 3x USB-A, SD card, 100W PD.',
    price: 49.99,
    stock_quantity: 67,
    image_url: 'https://placehold.co/400x400?text=USB+Hub',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '1a2b3c4d-0004-0000-0000-000000000004',
    name: 'Ergonomic Mouse',
    description: 'Vertical design, reduces wrist strain.',
    price: 39.99,
    stock_quantity: 55,
    image_url: 'https://placehold.co/400x400?text=Mouse',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ── Helpers ───────────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'API error');
  }
  return res.json() as Promise<T>;
}

// ── Products ──────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  if (USE_MOCK) return MOCK_PRODUCTS;
  return apiFetch<Product[]>('/products');
}

export async function getProductById(id: string): Promise<Product> {
  if (USE_MOCK) {
    const p = MOCK_PRODUCTS.find(p => p.id === id);
    if (!p) throw new Error('Product not found');
    return p;
  }
  return apiFetch<Product>(`/products/${id}`);
}

// ── Orders ────────────────────────────────────────────────────
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (USE_MOCK) {
    console.log('[MOCK] createOrder called with:', input);
    return {
      id: crypto.randomUUID(),
      user_id: input.user_id,
      status: 'pending',
      total_amount: 0,
      shipping_address: input.shipping_address,
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}