import { useState } from 'react'
import { Printer, Wrench } from 'lucide-react'
import Card from './Card'
import { openPrinterMaintenance, printTestPage } from '../lib/localAgent'

export default function PrinterTools({ onNotify }) {
  const [printerName, setPrinterName] = useState('')

  const handleMaintenance = async () => {
    try {
      await openPrinterMaintenance(printerName)
      onNotify(
        printerName ? `Mantenimiento de "${printerName}" abierto.` : 'Panel de impresoras abierto.'
      )
    } catch (err) {
      onNotify(err.message)
    }
  }

  const handleTestPage = async () => {
    try {
      const { result } = await printTestPage(printerName)
      onNotify(
        result?.outputFile
          ? `Página de prueba generada en ${result.outputFile}`
          : `Página de prueba enviada a "${printerName}".`
      )
    } catch (err) {
      onNotify(err.message)
    }
  }

  return (
    <Card icon={Printer} title="Control de Impresión" description="Diagnóstico y mantenimiento de impresoras">
      <div>
        <label htmlFor="printerName" className="mb-1.5 block text-xs font-medium text-slate-400">
          Nombre de la Impresora
        </label>
        <input
          id="printerName"
          type="text"
          value={printerName}
          onChange={(e) => setPrinterName(e.target.value)}
          placeholder="Nombre de la impresora"
          className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleMaintenance}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-800 active:bg-slate-700"
        >
          <Wrench className="h-4 w-4" />
          Abrir Mantenimiento
        </button>
        <button
          onClick={handleTestPage}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir Página de Prueba
        </button>
      </div>
    </Card>
  )
}
