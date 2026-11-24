import { useEffect, useState } from 'react'
import api, { errorDe } from '../lib/api'

/* Inventario (S4): items por etapa, alta, agregar stock y lotes de semen. */
interface Item {
  id: string
  name: string
  category: string
  stockQty: number
  minStock: number
  stage?: string | null
}

interface Lote {
  id: string
  lotCode: string
  availableDoses: number
  totalDoses: number
  status: string
  expiresAt?: string | null
}

const CATEGORIAS: Record<string, string> = {
  vaccine: 'Vacuna', semen: 'Semen', supply: 'Insumo',
}

export default function Inventario() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [lotes, setLotes] = useState<Lote[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrarAlta, setMostrarAlta] = useState(false)

  const cargar = () => {
    Promise.all([
      api.get('/inventory'),
      api.get('/semen-lots'),
    ]).then(([i, l]) => {
      setItems(i.data.data); setLotes(l.data.data); setError(null)
    }).catch(() => setError('Sin conexión. Reintentá cuando vuelva la señal.'))
  }

  useEffect(cargar, [])

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-brand-800">Stock</h1>
        <button onClick={() => setMostrarAlta((v) => !v)}
          className="rounded-full bg-brand-800 px-4 py-2 text-sm font-semibold text-cream-100 hover:bg-brand-900">
          {mostrarAlta ? 'Cerrar' : ' Registrar'}
        </button>
      </div>

      {mostrarAlta && <AltaItem onCreado={() => { setMostrarAlta(false); cargar() }} />}

      {error && <p className="text-sm font-medium text-alert-red" role="alert">{error}</p>}

      {items === null ? (
        <p className="mt-6 text-center text-sm text-ink-600">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-cream-200 bg-white p-6 text-center text-sm text-ink-600">
          Sin productos todavía. Registre vacunas, semen o insumos.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3">
              <span>
                <span className="block font-semibold text-ink-900">{i.name}</span>
                <span className="block text-xs text-ink-600">
                  {CATEGORIAS[i.category] ?? i.category}{i.stage ? ` · ${i.stage}` : ''}
                </span>
              </span>
              <span className={`text-sm font-bold ${i.stockQty <= i.minStock ? 'text-alert-red' : 'text-ink-900'}`}>
                {Number(i.stockQty)} u.
              </span>
            </li>
          ))}
        </ul>
      )}

      {lotes && lotes.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-ink-600">Lotes de semen</h2>
          <ul className="mt-2 space-y-2">
            {lotes.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3">
                <span>
                  <span className="block font-semibold text-ink-900">{l.lotCode}</span>
                  <span className="block text-xs text-ink-600">
                    {l.availableDoses}/{l.totalDoses} dosis{l.expiresAt ? ` · vence ${l.expiresAt}` : ''}
                  </span>
                </span>
                {l.availableDoses <= 3 && (
                  <span className="rounded-full bg-cream-200 px-3 py-1 text-xs font-bold text-gold-600">Bajo</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function AltaItem({ onCreado }: { onCreado: () => void }) {
  const [form, setForm] = useState({ name: '', category: 'vaccine' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/inventory', form)
      onCreado()
    } catch (err) {
      const reason = errorDe(err)?.details?.reason
      setError(reason === 'ITEM_NAME_ALREADY_EXISTS' ? 'Ya existe un producto con ese nombre.' : 'No se pudo crear. Revise los datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-cream-200 bg-white p-4">
      <label className="block">
        <span className="text-sm font-semibold text-ink-900">Nombre</span>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
          placeholder="Vacuna Aftosa" />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">Categoría</legend>
        <div className="mt-1 flex gap-2">
          {[['vaccine', 'Vacuna'], ['semen', 'Semen'], ['supply', 'Insumo']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, category: v })}
              className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${
                form.category === v ? 'bg-brand-800 text-cream-100' : 'border border-cream-200 bg-cream-100 text-ink-900'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm font-medium text-alert-red" role="alert">{error}</p>}
      <button disabled={loading}
        className="w-full rounded-full bg-brand-800 py-3 font-semibold text-cream-100 hover:bg-brand-900 disabled:opacity-50">
        {loading ? 'Creando…' : 'Agregar producto'}
      </button>
    </form>
  )
}
