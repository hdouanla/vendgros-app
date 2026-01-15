// Seller pages should not be prerendered since they require authentication
export const dynamic = 'force-dynamic';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
