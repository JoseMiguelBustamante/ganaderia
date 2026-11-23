import React, { useState } from 'react';
import { api, errorMessage } from '../api.js';

export default function ProtocolPage({ animals, demo, setDemo }) {
    const animal = animals[0];
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [stock, setStock] = useState(null);

    async function readStock(itemId) {
        const { data } = await api(`/api/inventory/${itemId}`);
        setStock(Number(data.stockQty ?? data.stock_qty));
    }

    async function setup() {
        setBusy('setup');
        setError('');
        setNotice('');
        setStock(null);
        try {
            let prepared;
            try {
                const { data: item } = await api('/api/inventory', {
                    method: 'POST', body: { name: 'Vacuna demo', category: 'supply', minStock: 1 },
                });
                await api(`/api/inventory/${item.id}/stock`, { method: 'POST', body: { qty: 3 } });
                const { data: protocol } = await api('/api/protocols', {
                    method: 'POST', body: {
                        name: 'Protocolo demo', phases: [
                            { phaseNumber: 1, name: 'Diagnóstico', requiredItemId: item.id, requiredQty: 1 },
                            { phaseNumber: 2, name: 'Examen' },
                            { phaseNumber: 3, name: 'Vacunación' },
                        ],
                    },
                });
                prepared = { itemId: item.id, protocolId: protocol.id, animalId: animal.id, completed: false };
                setDemo(prepared);
            } catch (failure) {
                if (failure.status !== 409 || failure.errorBody?.error?.code !== 'CONFLICT' || !demo) throw failure;
                prepared = demo;
                setNotice('El demo ya está preparado');
            }
            await readStock(prepared.itemId);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(''); }
    }

    async function execute() {
        setBusy('execute');
        setError('');
        setNotice('');
        try {
            if (!demo.completed) {
                await api(`/api/protocols/animals/${demo.animalId}/execute`, {
                    method: 'POST', body: { protocolId: demo.protocolId, phaseNumber: 1 },
                });
                setDemo({ ...demo, completed: true });
            }
            setStock(null);
            await readStock(demo.itemId);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(''); }
    }

    return <section aria-labelledby="protocol-title" aria-busy={Boolean(busy)}>
        <h2 id="protocol-title">Protocolo demo</h2>
        <p>La fase 1 descuenta una unidad de Vacuna demo de forma atómica.</p>
        {animal ? <p>Animal: {animal.earTag ?? animal.ear_tag}</p> : <p>Crea un animal antes de preparar el demo.</p>}
        <button data-testid="demo-setup-button" disabled={Boolean(busy) || !animal} onClick={setup}>
            {busy === 'setup' ? 'Preparando demo…' : 'Preparar demo'}
        </button>
        <button data-testid="phase-execute-button"
            disabled={Boolean(busy) || !demo || (demo.completed && stock !== null)} onClick={execute}>
            {busy === 'execute' ? 'Completando fase…' : demo?.completed && stock === null ? 'Consultar stock' : 'Completar fase 1'}
        </button>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {demo?.completed && <p role="status">Fase 1 completada</p>}
        {stock !== null && <p data-testid="stock-readout" role="status">Stock restante: {stock}</p>}
        <button disabled={Boolean(busy)} onClick={() => { window.location.hash = '/animals'; }}>Volver a animales</button>
    </section>;
}
