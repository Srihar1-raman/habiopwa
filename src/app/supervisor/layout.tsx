export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-container min-h-dvh bg-gray-50">
      {/* Supervisor header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#004aad] flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="text-white font-bold">HABIO Supervisor</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          Admin
        </span>
      </div>
      {children}
    </div>
  );
}
