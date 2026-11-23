import React, { useState } from 'react';
import { api, errorMessage } from '../api.js';

export default function LoginPage({ onSession }) {
    const [login, setLogin] = useState(false);
    const [fields, setFields] = useState(() => ({
        tenantName: 'Demo Ganaderia', slug: `demo-${Date.now().toString(36)}`,
        email: 'demo@local.test', password: 'demo-pass-123', displayName: 'Demo Owner',
    }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function submit(event) {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            const body = login
                ? { slug: fields.slug, email: fields.email, password: fields.password }
                : fields;
            const response = await api(`/api/auth/${login ? 'login' : 'register'}`, { method: 'POST', body });
            onSession(response.data);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(false); }
    }

    return <section aria-labelledby="login-title">
        <h2 id="login-title">{login ? 'Entrar' : 'Registro demo'}</h2>
        <form onSubmit={submit} aria-busy={busy}>
            {(login ? ['slug', 'email', 'password'] : ['tenantName', 'slug', 'email', 'password', 'displayName']).map((field) =>
                <label key={field}>
                    {{ tenantName: 'Ganadería', slug: 'Identificador de ganadería', email: 'Email', password: 'Contraseña', displayName: 'Nombre' }[field]}
                    <input name={field} required disabled={busy}
                        type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                        value={fields[field]} onChange={(event) => setFields({ ...fields, [field]: event.target.value })} />
                </label>)}
            {error && <p role="alert">{error}</p>}
            <button disabled={busy} type="submit">{busy ? 'Entrando…' : login ? 'Entrar' : 'Registrarme y entrar'}</button>
        </form>
        <button disabled={busy} type="button" onClick={() => { setLogin(!login); setError(''); }}>
            {login ? 'Crear cuenta demo' : 'Ya tengo cuenta'}
        </button>
    </section>;
}
