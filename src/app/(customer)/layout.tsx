export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mobile-container">{children}</div>;
}
