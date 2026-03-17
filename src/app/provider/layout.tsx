export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-[480px] min-h-dvh bg-white flex flex-col">
        {children}
      </div>
    </div>
  );
}
