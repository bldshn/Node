import type { CreateProductInput } from '../types/product';

export const validateProduct = (data: unknown): data is CreateProductInput => {
  if (typeof data !== 'object' || data === null) return false;

  const product = data as Record<string, unknown>;

  return (
    typeof product.name === 'string' &&
    product.name.length > 0 &&
    typeof product.description === 'string' &&
    product.description.length > 0 &&
    typeof product.price === 'number' &&
    product.price > 0 &&
    typeof product.inventory === 'number' &&
    product.inventory >= 0 &&
    typeof product.imageUrl === 'string' &&
    product.imageUrl.length > 0
  );
};

export const validateProductUpdate = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null) return false;

  const product = data as Record<string, unknown>;

  return Object.entries(product).every(([key, value]) => {
    if (key === 'id') return typeof value === 'string';
    if (key === 'name') return typeof value === 'string' && value.length > 0;
    if (key === 'description') return typeof value === 'string' && value.length > 0;
    if (key === 'price') return typeof value === 'number' && value > 0;
    if (key === 'inventory') return typeof value === 'number' && value >= 0;
    if (key === 'imageUrl') return typeof value === 'string' && value.length > 0;
    return false;
  });
};
