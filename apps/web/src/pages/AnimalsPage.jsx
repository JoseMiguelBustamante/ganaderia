import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api.js';

export default function AnimalsPage({ animals, setAnimals }) {
    const [earTag, setEarTag] = useState('E-0001');
    const [sex, setSex] = useState('female');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        api('/api/animals').then(({ data }) => { if (active) setAnimals(data); })
            .catch((failure) => { if (active) setError(errorMessage(failure)); })
            .finally(() => { if (active) setBusy(false); });
        return () => { active = false; };
    }, [setAnimals]);

    async function create(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await api('/api/animals', { method: 'POST', body: { earTag, sex } });
            const { data } = await api('/api/animals');
            setAnimals(data);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(false); }
    }

    return <section aria-labelledby="animals-title">
        <h2 id="animals-title">Animales</h2>
        <form onSubmit={create} aria-busy={busy}>
            <label>Caravana
                <input data-testid="animal-ear-tag-input" value={earTag} required disabled={busy}
                    onChange={(event) => setEarTag(event.target.value)} />
            </label>
            <label>Sexo
                <select value={sex} disabled={busy} onChange={(event) => setSex(event.target.value)}>
                    <option value="female">female</option><option value="male">male</option>
                </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button data-testid="animal-create-button" disabled={busy} type="submit">{busy ? 'Cargando…' : 'Crear animal'}</button>
        </form>
        <table>
            <caption>Animales registrados</caption>
            <thead><tr><th scope="col">Caravana</th><th scope="col">Sexo</th></tr></thead>
            <tbody>{animals.map((animal) => <tr key={animal.id} data-testid="animal-row">
                <td>{animal.earTag ?? animal.ear_tag}</td><td>{animal.sex}</td>
            </tr>)}</tbody>
        </table>
        <button disabled={busy || animals.length === 0} onClick={() => { window.location.hash = '/protocol'; }}>Ir a protocolo</button>
    </section>;
}
