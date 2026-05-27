export default function ClassesLoading() {
  return (
    <div className="w-full p-4 md:p-[30px]" aria-busy="true">
      <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-6">
        <div className="space-y-3">
          <div className="h-9 w-[320px] max-w-full animate-pulse rounded bg-[#e9eef0]" />
          <div className="h-5 w-[560px] max-w-full animate-pulse rounded bg-[#edf2f4]" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[78px] rounded-[18px] border border-[#f0f0f0] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-[10px] bg-[#d2f1f5]" />
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-[#e9eef0]" />
                  <div className="h-4 w-10 animate-pulse rounded bg-[#edf2f4]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-[320px] rounded-[18px] border border-[#f0f0f0] bg-white p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="h-10 w-64 animate-pulse rounded bg-[#edf2f4]" />
            <div className="h-10 w-40 animate-pulse rounded bg-[#edf2f4]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded bg-[#f5f7f8]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
