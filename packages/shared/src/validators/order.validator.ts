import type { CreateOrderInput } from '../types/order';

export const validateOrder = (data: unknown): data is CreateOrderInput => {
  if (typeof data !== 'object' || data === null) return false;

  const order = data as Record<string, unknown>;

  const hasValidItems = Array.isArray(order.items) && order.items.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false;
    const orderItem = item as Record<string, unknown>;
    return (
      typeof orderItem.productId === 'string' &&
      typeof orderItem.quantity === 'number' &&
      orderItem.quantity > 0 &&
      typeof orderItem.price === 'number' &&
      orderItem.price > 0
    );
  });

  return (
    typeof order.userId === 'string' &&
    hasValidItems &&
    typeof order.shippingAddress === 'string' &&
    order.shippingAddress.length > 0
  );
};
