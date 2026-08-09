export default function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 transition-all duration-200 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-black/20 dark:hover:border-slate-700 dark:hover:shadow-black/30 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-600/15 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </section>
  )
}
