import type { ReactNode } from 'react';

export const metadata = {
  title: 'eCommerce Store',
  description: 'Your next shopping destination',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
