// Ratings pages should not be prerendered since they require authentication
export const dynamic = 'force-dynamic';

export default function RatingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
