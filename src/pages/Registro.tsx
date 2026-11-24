import { useState } from 'react'
import api, { errorDe } from '../lib/api'
import { guardarToken } from '../lib/session'

/* Registro de establecimiento (tenant + owner). POST /api/auth/register */
const MENSAJES: Record<string, string> = {
  SLUG_ALREADY_EXISTS: 'Ese nombre de establecimiento ya está en uso. Probá otro.',
  EMAIL_ALREADY_EXISTS: 'Ese email ya está registrado en este establishment.',
}

export default function Registro() {
  const [form, setForm] = useState({
    tenantName: '',
    slug: '',
    email: '',
    password: '',
    displayName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const autoSlug = () => {
    if (!form.slug && form.tenantName) {
      setForm((f) => ({
        ...f,
        slug: f.tenantName.toLowerCase().normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      }))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      guardarToken(data.data.token)
      window.location.replace('/')
    } catch (err) {
      const apiError = errorDe(err)
      const reason = apiError?.details?.reason
      setError(
        reason
          ? (MENSAJES[reason] ?? 'No se pudo registrar. Revisá los datos e intentá de nuevo.')
          : 'No se pudo conectar. Verificá tu señal e intentá de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 text-ink-900 placeholder:text-ink-600/50 focus:outline-none focus:ring-2 focus:ring-gold-500'

  return (
    <div className="min-h-screen bg-cream-100 p-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display mt-4 text-center text-3xl font-extrabold text-brand-800">
          Registre su establecimiento
        </h1>
        <p className="mt-2 text-center text-sm text-ink-600">
          Un solo registro para todo el campo. Usted queda como responsable.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">Nombre del establecimiento</span>
            <input required value={form.tenantName} onChange={set('tenantName')} onBlur={autoSlug}
              className={inputCls} placeholder="Estancia La Fortuna" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">Dirección web (se genera sola)</span>
            <input required value={form.slug} onChange={set('slug')}
              className={inputCls} placeholder="estancia-la-fortuna" />
            <span className="mt-1 block text-xs text-ink-600">Solo letras, números y guiones.</span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">Su nombre</span>
            <input required value={form.displayName} onChange={set('displayName')}
              className={inputCls} placeholder="José Miguel" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">Email</span>
            <input required type="email" value={form.email} onChange={set('email')}
              className={inputCls} placeholder="tu@email.com" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">Contraseña</span>
            <input required type="password" minLength={8} value={form.password} onChange={set('password')}
              className={inputCls} placeholder="Mínimo 8 caracteres" />
          </label>
          {error && <p className="text-sm font-medium text-alert-red" role="alert">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-brand-800 py-3 font-semibold text-cream-100 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Crear establecimiento'}
          </button>
          <p className="text-center text-sm text-ink-600">
            ¿Ya tiene cuenta? <a href="/login" className="font-semibold text-gold-600">Ingresar</a>
          </p>
        </form>
      </div>
    </div>
  )
}
