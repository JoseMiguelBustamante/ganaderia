import axios, { isAxiosError } from 'axios'
import { leerToken, borrarToken } from './session'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = leerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401 && leerToken()) {
      borrarToken()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export interface ApiError {
  code: string
  message: string
  details?: { reason?: string }
}

export const errorDe = (err: unknown): ApiError | null =>
  isAxiosError(err) ? (err.response?.data?.error ?? null) : null

export default api
