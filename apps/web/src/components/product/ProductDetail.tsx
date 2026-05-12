'use client';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Product {productId}</h1>
      {/* TODO: Load and display product details */}
    </div>
  );
}
