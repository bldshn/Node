'use client';

import { useParams } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <main className="container mx-auto px-4 py-8">
      <ProductDetail productId={id} />
    </main>
  );
}
