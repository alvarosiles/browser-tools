import { CheckCircle2 } from 'lucide-react'

export default function Toast({ message }) {
  if (!message) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-blue-400" />
        <p className="text-sm text-slate-200">{message}</p>
      </div>
    </div>
  )
}
