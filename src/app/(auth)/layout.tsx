/**
 * (auth) group layout — minimal centered shell, no navigation.
 * Applies the #f8f9ff surface background from the design tokens.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      {children}
    </div>
  );
}
