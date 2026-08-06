import { Wrench } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/40">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
            IT Support Tools
          </h1>
          <p className="text-xs text-slate-400">Panel de mantenimiento para Windows</p>
        </div>
      </div>
    </header>
  )
}
