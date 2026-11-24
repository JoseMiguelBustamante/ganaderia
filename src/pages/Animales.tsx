import { useEffect, useState } from 'react'
import api, { errorDe } from '../lib/api'

/* Lista de animales con búsqueda + alta (S2). */
interface Animal {
  id: string
  earTag: string
  name: string | null
  sex: string
  status: string
}

export default function Animales() {
  const [search, setSearch] = useState('')
  const [animales, setAnimales] = useState<Animal[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrarAlta, setMostrarAlta] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/animals', { params: search.trim() ? { search: search.trim() } : {} })
        .then(({ data }) => { setAnimales(data.data); setError(null) })
        .catch((err) => {
          const e = errorDe(err)
          setError(e ? 'No se pudo cargar la lista de animales.' : 'Sin conexión. Reintentá cuando vuelva la señal.')
          setAnimales((prev) => prev ?? [])
        })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-brand-800">Animales</h1>
        <button
          onClick={() => setMostrarAlta((v) => !v)}
          className="rounded-full bg-brand-800 px-4 py-2 text-sm font-semibold text-cream-100 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          {mostrarAlta ? 'Cerrar' : ' Registrar'}
        </button>
      </div>

      {mostrarAlta && <AltaAnimal onCreado={() => { setMostrarAlta(false); setSearch('') }} />}

      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por caravana o nombre…"
        className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-600/60 focus:outline-none focus:ring-2 focus:ring-gold-500"
      />

      {error && <p className="mt-3 text-sm font-medium text-alert-red" role="alert">{error}</p>}

      {animales === null ? (
        <p className="mt-6 text-center text-sm text-ink-600">Cargando…</p>
      ) : animales.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-cream-200 bg-white p-6 text-center">
          <p className="font-semibold text-ink-900">No hay animales todavía</p>
          <p className="mt-1 text-sm text-ink-600">Use «Registrar» para dar de alta el primero.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {animales.map((a) => (
            <li key={a.id}>
              <a
                href={`/animales/${a.id}`}
                className="flex min-h-[64px] items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <span>
                  <span className="block font-semibold text-ink-900">{a.earTag}</span>
                  {a.name && <span className="block text-sm text-ink-600">{a.name}</span>}
                </span>
                <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-ink-600">
                  {a.sex === 'female' ? 'Hembra' : 'Macho'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AltaAnimal({ onCreado }: { onCreado: () => void }) {
  const [form, setForm] = useState({ earTag: '', name: '', sex: 'female' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/animals', { ...form, name: form.name || undefined })
      onCreado()
    } catch (err) {
      const reason = errorDe(err)?.details?.reason
      setError(
        reason === 'EAR_TAG_ALREADY_EXISTS'
          ? 'Esa caravana ya existe en su establecimiento.'
          : 'No se pudo crear el animal. Revise los datos.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-cream-200 bg-white p-4">
      <label className="block">
        <span className="text-sm font-semibold text-ink-900">Caravana</span>
        <input required value={form.earTag} onChange={(e) => setForm({ ...form, earTag: e.target.value })}
          className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
          placeholder="A-1042" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink-900">Nombre (opcional)</span>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
          placeholder="Fortuna" />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">Sexo</legend>
        <div className="mt-1 flex gap-2">
          {[['female', 'Hembra'], ['male', 'Macho']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, sex: v })}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${
                form.sex === v ? 'bg-brand-800 text-cream-100' : 'border border-cream-200 bg-cream-100 text-ink-900'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm font-medium text-alert-red" role="alert">{error}</p>}
      <button disabled={loading}
        className="w-full rounded-full bg-brand-800 py-3 font-semibold text-cream-100 hover:bg-brand-900 disabled:opacity-50">
        {loading ? 'Creando…' : 'Dar de alta'}
      </button>
    </form>
  )
}
