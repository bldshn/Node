'use client';

import Image from 'next/image';
import type { Product } from '@ecommerce/shared';
import { useCartStore } from '@/store/cartStore';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = () => {
    addItem(product);
    openCart();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="relative w-full aspect-square bg-gray-50">
        <Image
          src={product.image_url ?? 'https://placehold.co/400x400?text=No+Image'}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-500">Out of stock</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={product.stock_quantity === 0}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
