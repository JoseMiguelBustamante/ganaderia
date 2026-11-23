const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let token = null;

export function setToken(value) {
    token = value;
}

export async function api(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const errorBody = await response.json();
    if (!response.ok) throw { status: response.status, errorBody };
    return errorBody;
}

export function errorMessage(error) {
    return error.errorBody?.error?.message || error.message || 'No se pudo completar la solicitud';
}
