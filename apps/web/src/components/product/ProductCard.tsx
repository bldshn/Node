import Link from 'next/link';
import type { Product } from '@ecommerce/shared';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-lg transition">
        <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded" />
        <h3 className="mt-4 font-semibold">{product.name}</h3>
        <p className="text-gray-600">${product.price.toFixed(2)}</p>
        <p className="text-sm text-gray-500">In stock: {product.inventory}</p>
      </div>
    </Link>
  );
}
