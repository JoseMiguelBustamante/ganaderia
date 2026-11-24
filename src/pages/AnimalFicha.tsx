import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { errorDe } from '../lib/api'

/* Ficha del animal (S2/S3): estado del protocolo + completar fase.
   Usa GET /api/protocols/animals/:id/status y POST .../execute. */
interface FaseEstado {
  phaseNumber: number
  name: string
  state: 'completed' | 'current' | 'pending'
  executedAt?: string | null
  teamId?: string | null
  notes?: string | null
}

interface ProtocoloStatus {
  protocol: { id: string; name: string }
  animal: { id: string; earTag: string; name: string | null; sex: string; status: string }
  phases: FaseEstado[]
}

export default function AnimalFicha() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<ProtocoloStatus | null>(null)
  const [protocoloId, setProtocoloId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ejecutando, setEjecutando] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get('/protocols')
      .then(({ data }) => {
        const protocolos = data.data as { id: string; name: string; isProtocol?: boolean }[]
        const criia = protocolos.find((p) => p.name === 'Cría') ?? protocolos[0]
        if (!criia) {
          // Crear el protocolo de cría si el tenant no tiene ninguno.
          return api.post('/protocols/breeding').then(({ data: d2 }) => {
            setProtocoloId(d2.data.id)
            return cargar(d2.data.id)
          })
        }
        setProtocoloId(criia.id)
        return cargar(criia.id)
      })
      .catch((err) => {
        const e = errorDe(err)
        setError(e ? 'No se pudo cargar el protocolo.' : 'Sin conexión. La ficha se carga al volver la señal.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, protocoloId])

  const cargar = (pid: string) =>
    api.get(`/protocols/animals/${id}/status`, { params: { protocolId: pid } })
      .then(({ data }) => { setStatus(data.data); setError(null) })

  const completarFase = async (fase: FaseEstado) => {
    if (!id || !protocoloId) return
    setEjecutando(true)
    setError(null)
    try {
      await api.post(`/protocols/animals/${id}/execute`, {
        protocolId: protocoloId,
        phaseNumber: fase.phaseNumber,
      })
      await cargar(protocoloId)
    } catch (err) {
      const reason = errorDe(err)?.details?.reason
      setError(
        reason === 'INSUFFICIENT_STOCK'
          ? 'La fase pide un insumo sin stock suficiente. Revise el inventario.'
          : 'No se pudo completar la fase. Reintentá.',
      )
    } finally {
      setEjecutando(false)
    }
  }

  if (!status) {
    return <p className="mt-8 text-center text-sm text-ink-600">{error ?? 'Cargando ficha…'}</p>
  }

  const actual = status.phases.find((p) => p.state === 'current')

  return (
    <div className="mx-auto max-w-md">
      <a href="/animales" className="text-sm font-semibold text-brand-800">← Volver</a>
      <h1 className="font-display mt-2 text-3xl font-extrabold text-brand-800">
        {status.animal.earTag}{status.animal.name ? ` «${status.animal.name}»` : ''}
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        {status.animal.sex === 'female' ? 'Hembra' : 'Macho'} · {status.protocol.name}
      </p>

      {/* Progreso de fases */}
      <ol className="mt-5 flex gap-1.5">
        {status.phases.map((f) => (
          <li key={f.phaseNumber} className="flex-1">
            <span className="sr-only">{f.name}: {f.state}</span>
            <span
              aria-hidden="true"
              className={`block h-2 rounded-full ${
                f.state === 'completed' ? 'bg-brand-800'
                : f.state === 'current' ? 'bg-gold-500'
                : 'bg-cream-200'
              }`}
            />
            <span className={`mt-1 block text-[10px] font-semibold ${
              f.state === 'current' ? 'text-gold-600' : 'text-ink-600'
            }`}>{f.name}</span>
          </li>
        ))}
      </ol>

      {/* Acción principal */}
      {actual && (
        <div className="mt-6">
          <button
            disabled={ejecutando}
            onClick={() => completarFase(actual)}
            className="flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-brand-800 px-5 py-4 text-left font-semibold text-cream-100 hover:bg-brand-900 disabled:opacity-50"
          >
            <span>
              Completar fase {actual.phaseNumber}: {actual.name}
              <span className="block text-xs font-normal text-cream-100/80">
                {ejecutando ? 'Registrando…' : 'Queda registrada con fecha y responsable'}
              </span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm font-medium text-alert-red" role="alert">{error}</p>}

      {/* Historial */}
      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">Historial</h2>
        <ul className="mt-2 space-y-2">
          {status.phases.filter((f) => f.state === 'completed').length === 0 && (
            <li className="rounded-xl border border-dashed border-cream-200 bg-white p-4 text-sm text-ink-600">
              Aún no hay fases completadas.
            </li>
          )}
          {status.phases.filter((f) => f.state === 'completed').map((f) => (
            <li key={f.phaseNumber} className="rounded-xl border border-cream-200 bg-white p-4 text-sm">
              <span className="font-semibold text-ink-900">Fase {f.phaseNumber}: {f.name}</span>
              {f.executedAt && (
                <span className="block text-xs text-ink-600">
                  {new Date(f.executedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  {f.notes ? ` — ${f.notes}` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
