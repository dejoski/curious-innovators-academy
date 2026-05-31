export default function SettingsLoading() {
  return (
    <div className="w-full max-w-[1168px] mx-auto p-8 pb-16 font-sans" role="status" aria-live="polite" aria-busy="true">
      <div className="mb-8">
        <div className="h-8 w-56 animate-pulse rounded-[6px] bg-[#e7edf1]" />
        <div className="mt-3 h-5 w-full max-w-[520px] animate-pulse rounded-[6px] bg-[#eef2f5]" />
      </div>

      <div className="space-y-6">
        {[0, 1, 2].map((item) => (
          <section key={item} className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
            <div className="h-6 w-40 animate-pulse rounded-[6px] bg-[#e7edf1]" />
            <div className="mt-3 h-4 w-full max-w-[440px] animate-pulse rounded-[6px] bg-[#eef2f5]" />
            <div className="mt-6 grid gap-4">
              <div className="h-12 max-w-xl animate-pulse rounded-[10px] bg-[#f2f5f7]" />
              <div className="h-12 max-w-xl animate-pulse rounded-[10px] bg-[#f2f5f7]" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
