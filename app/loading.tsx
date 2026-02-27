export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#b3e5fc] border-t-[#0097a7] animate-spin" />
        <p className="text-[#4a7fa5] text-sm font-medium">Loading…</p>
      </div>
    </div>
  )
}
