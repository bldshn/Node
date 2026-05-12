'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@ecommerce/shared';
import { ProductGrid } from '@/components/product/ProductGrid';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch products from API
    setLoading(false);
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to Our Store</h1>
      {loading ? <p>Loading...</p> : <ProductGrid products={products} />}
    </main>
  );
}
