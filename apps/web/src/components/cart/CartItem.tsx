'use client';

interface CartItemProps {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function CartItem({ id, name, price, quantity }: CartItemProps) {
  return (
    <div className="border-b py-4">
      <h3 className="font-semibold">{name}</h3>
      <p className="text-sm text-gray-600">
        Quantity: {quantity} × ${price.toFixed(2)}
      </p>
      <p className="font-bold">${(price * quantity).toFixed(2)}</p>
    </div>
  );
}
