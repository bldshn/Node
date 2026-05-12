export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Pick<import('./product').Product, 'name' | 'image_url'>;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  full_name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CreateOrderInput {
  user_id: string;
  shipping_address: ShippingAddress;
  items: {
    product_id: string;
    quantity: number;
  }[];
}