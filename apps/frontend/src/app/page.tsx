import { getProducts } from '@/lib/apiClient';
import ProductGrid from '@/components/ProductGrid';

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
        <p className="text-gray-500 mt-1">{products.length} items available</p>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
