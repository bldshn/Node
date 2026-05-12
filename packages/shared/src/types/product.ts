export interface Product {
  id: string;               // UUID
  name: string;
  description: string | null;
  price: number;            // stored as numeric(10,2), returned as number
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;       // ISO string
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
}