export default function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20 transition-all duration-200 hover:border-slate-700 hover:shadow-xl hover:shadow-black/30 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-100 sm:text-lg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </section>
  )
}
