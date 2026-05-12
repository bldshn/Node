'use client';

export function CheckoutForm() {
  return (
    <form className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <fieldset>
          <legend className="text-lg font-semibold mb-4">Shipping Information</legend>
          {/* TODO: Add form fields */}
        </fieldset>
        <fieldset>
          <legend className="text-lg font-semibold mb-4">Payment Information</legend>
          {/* TODO: Add payment fields */}
        </fieldset>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
          Place Order
        </button>
      </div>
    </form>
  );
}
