// Listings pages should not be prerendered since they may require authentication
export const dynamic = 'force-dynamic';

export default function ListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
