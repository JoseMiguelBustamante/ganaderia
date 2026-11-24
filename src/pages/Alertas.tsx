import { useEffect, useState } from 'react'
import api from '../lib/api'

/* Alertas (S4): GET /api/inventory/alerts — severidad por texto, no solo color. */
interface AlertaItem { id: string; name: string; stockQty: number; minStock: number }
interface AlertaLote { id: string; lotCode: string; availableDoses: number; expiresAt?: string | null }

interface Alertas {
  lowStockItems: AlertaItem[]
  lowDoseLots: AlertaLote[]
  expiredLots: AlertaLote[]
}

export default function Alertas() {
  const [data, setData] = useState<Alertas | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    api.get('/inventory/alerts')
      .then(({ data: d }) => setData(d.data))
      .catch(() => setOffline(true))
  }, [])

  if (offline) {
    return <p className="mt-8 rounded-xl bg-cream-200 p-4 text-center text-sm text-ink-900">
      Sin conexión — las alertas se actualizan al volver la señal.
    </p>
  }
  if (!data) return <p className="mt-8 text-center text-sm text-ink-600">Cargando…</p>

  const vacio = data.lowStockItems.length === 0 && data.expiredLots.length === 0 && data.lowDoseLots.length === 0

  if (vacio) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-brand-800">Alertas</h1>
        <p className="mt-6 rounded-2xl border border-dashed border-cream-200 bg-white p-6 text-center text-sm text-ink-600">
          Todo al día ✓ — sin stock bajo mínimos, sin lotes con pocas dosis y sin lotes vencidos.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold text-brand-800">Requiere acción</h1>

      {data.expiredLots.length > 0 && (
        <section className="mt-4 space-y-2">
          {data.expiredLots.map((l) => (
            <div key={l.id} className="rounded-2xl bg-red-50 p-4" style={{ backgroundColor: '#FCEBE7' }}>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-alert-red">VENCIDO</span>
              <p className="mt-1 font-semibold text-ink-900">Lote {l.lotCode} venció{l.expiresAt ? ` el ${l.expiresAt}` : ''}</p>
              <p className="text-sm text-ink-600">Quedan {l.availableDoses} dosis sin usar. Revise antes de la próxima inseminación.</p>
            </div>
          ))}
        </section>
      )}

      {data.lowStockItems.length > 0 && (
        <section className="mt-4 space-y-2">
          {data.lowStockItems.map((i) => (
            <div key={i.id} className="rounded-2xl bg-red-50 p-4" style={{ backgroundColor: '#FCEBE7' }}>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-alert-red">BAJO</span>
              <p className="mt-1 font-semibold text-ink-900">{i.name} sin stock suficiente</p>
              <p className="text-sm text-ink-600">Hay {Number(i.stockQty)} y el mínimo es {Number(i.minStock)}. Comprar a tiempo.</p>
            </div>
          ))}
        </section>
      )}

      {data.lowDoseLots.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">Avisos</h2>
          <div className="mt-2 space-y-2">
            {data.lowDoseLots.map((l) => (
              <div key={l.id} className="rounded-2xl p-4" style={{ backgroundColor: '#F6E3C6' }}>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-gold-600">
                  {l.availableDoses} DOSIS
                </span>
                <p className="mt-1 font-semibold text-ink-900">Lote {l.lotCode} casi agotado</p>
                <p className="text-sm text-ink-600">Pedir a proveedor antes de agotarse.</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
