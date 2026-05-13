import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="text-center py-24 max-w-md mx-auto">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed!</h1>
      <p className="text-gray-500 mb-8">Thanks for your purchase. You'll receive a confirmation shortly.</p>
      <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
        Continue shopping →
      </Link>
    </div>
  );
}
