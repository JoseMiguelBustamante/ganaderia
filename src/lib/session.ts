const KEY = 'ganaderia.token'

export const guardarToken = (token: string) => localStorage.setItem(KEY, token)
export const leerToken = () => localStorage.getItem(KEY)
export const borrarToken = () => localStorage.removeItem(KEY)
