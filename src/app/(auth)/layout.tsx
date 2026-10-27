export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <p className="text-center text-2xl font-semibold tracking-tight">
          Ascend
        </p>
        {children}
      </div>
    </main>
  );
}
