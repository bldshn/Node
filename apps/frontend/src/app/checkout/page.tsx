'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { createOrder } from '@/lib/apiClient';
import type { ShippingAddress } from '@ecommerce/shared';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState<ShippingAddress>({
    full_name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      await createOrder({
        user_id: 'guest-user', // replace with real auth user ID in production
        shipping_address: address,
        items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      });

      clearCart();
      router.push('/checkout/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shipping address</h2>

          {[
            { name: 'full_name',    label: 'Full name',    required: true },
            { name: 'line1',        label: 'Address line 1', required: true },
            { name: 'line2',        label: 'Address line 2', required: false },
            { name: 'city',         label: 'City',         required: true },
            { name: 'state',        label: 'State',        required: true },
            { name: 'postal_code',  label: 'Postal code',  required: true },
            { name: 'country',      label: 'Country',      required: true },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type="text"
                name={field.name}
                value={address[field.name as keyof ShippingAddress] ?? ''}
                onChange={handleChange}
                required={field.required}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Order summary</h2>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between text-sm text-gray-700">
              <span>{product.name} × {quantity}</span>
              <span>${(product.price * quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>${totalPrice().toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Placing order...' : 'Place order →'}
        </button>
      </form>
    </div>
  );
}
