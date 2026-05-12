import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col">
      {label && <label className="mb-2 font-semibold text-gray-700">{label}</label>}
      <input
        className={`border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
        {...props}
      />
    </div>
  );
}
