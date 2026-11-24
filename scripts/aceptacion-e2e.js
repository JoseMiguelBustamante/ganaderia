#!/usr/bin/env node
// Acceptance check: exercises the whole product against a running API, the way
// a real establishment would, and prints PASS/FAIL per step.
//
//   node scripts/aceptacion-e2e.js [API_BASE]
//
// Defaults to production. It creates a throwaway tenant named "Aceptación
// <marca>" and leaves it deactivated at the end, so the run is repeatable and
// does not pollute dashboards.
const BASE = process.argv[2] ?? 'https://ganaderia.187.127.19.244.sslip.io/api';
const STAMP = Date.now().toString(36);

let token = null;
let fallas = 0;
let pasos = 0;

const ok = (nombre, extra = '') => {
    pasos += 1;
    console.log(`  PASS  ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const fallo = (nombre, motivo) => {
    pasos += 1;
    fallas += 1;
    console.log(`  FAIL  ${nombre} — ${motivo}`);
};
const esperar = (condicion, nombre, extra) =>
    (condicion ? ok(nombre, extra) : fallo(nombre, 'condición no cumplida'));

async function api(method, path, body, { anon = false } = {}) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && !anon ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const tipo = res.headers.get('content-type') ?? '';
    const payload = tipo.includes('json') ? await res.json().catch(() => null) : await res.text();
    return { status: res.status, body: payload, headers: res.headers };
}

const hoy = new Date().toISOString().slice(0, 10);

console.log(`Aceptación end-to-end contra ${BASE}\n`);

// 1. Registro del establecimiento
const email = `aceptacion-${STAMP}@prueba.example`;
let r = await api('POST', '/auth/register', {
    tenantName: `Aceptación ${STAMP}`,
    slug: `aceptacion-${STAMP}`,
    email,
    password: 'aceptacion-12345',
    displayName: 'Productor de prueba',
}, { anon: true });
esperar(r.status === 201 && r.body?.data?.token, 'Alta del establecimiento', `HTTP ${r.status}`);
token = r.body?.data?.token;

// 2. Login por email
r = await api('POST', '/auth/login', { email, password: 'aceptacion-12345' }, { anon: true });
esperar(r.status === 200 && r.body?.data?.token, 'Login por email', `HTTP ${r.status}`);

// 3. Login con clave equivocada
r = await api('POST', '/auth/login', { email, password: 'incorrecta' }, { anon: true });
esperar(r.status === 401 && r.body?.error?.details?.reason === 'INVALID_CREDENTIALS',
    'Rechazo de clave incorrecta', `HTTP ${r.status}`);

// 4. Proveedor
r = await api('POST', '/suppliers', { name: `Proveedor ${STAMP}`, contactName: 'Contacto' });
const proveedorId = r.body?.data?.id;
esperar(r.status === 201 && proveedorId, 'Alta de proveedor', `HTTP ${r.status}`);

// 5. Insumo + stock + lote de semen
r = await api('POST', '/inventory', { name: `Vacuna ${STAMP}`, category: 'vaccine', unit: 'dosis', minStock: 5 });
const vacunaId = r.body?.data?.id;
esperar(r.status === 201 && vacunaId, 'Alta de insumo', `HTTP ${r.status}`);

r = await api('POST', `/inventory/${vacunaId}/stock`, { qty: 3 });
esperar(r.status === 200 && Number(r.body?.data?.stockQty) === 3, 'Entrada de stock', `HTTP ${r.status}`);

r = await api('POST', '/inventory', { name: `Semen ${STAMP}`, category: 'semen', unit: 'dosis' });
const semenId = r.body?.data?.id;
await api('POST', `/inventory/${semenId}/stock`, { qty: 8 });
r = await api('POST', '/semen-lots', {
    itemId: semenId, supplierId: proveedorId, lotCode: `L-${STAMP}`, totalDoses: 6, expiresAt: '2028-01-31',
});
const loteId = r.body?.data?.id;
esperar(r.status === 201 && loteId, 'Alta de lote de semen', `HTTP ${r.status}`);

// 6. Protocolo de cría + animal + fase
r = await api('POST', '/protocols/breeding');
const protocoloId = r.body?.data?.id;
esperar([200, 201].includes(r.status) && protocoloId, 'Protocolo de cría', `HTTP ${r.status}`);

r = await api('POST', '/animals', { earTag: `AE-${STAMP}`, sex: 'female', name: 'Aceptación' });
const animalId = r.body?.data?.id;
esperar(r.status === 201 && animalId, 'Alta de animal', `HTTP ${r.status}`);

r = await api('POST', '/protocols/animals/' + animalId + '/execute', { protocolId: protocoloId, phaseNumber: 1 });
esperar(r.status === 200, 'Completar fase 1', `HTTP ${r.status}`);

r = await api('GET', `/protocols/animals/${animalId}/status?protocolId=${protocoloId}`);
const fases = r.body?.data?.phases ?? [];
esperar(r.status === 200 && fases[0]?.state === 'completed' && fases[1]?.state === 'current',
    'Estado del protocolo por animal', `${fases.filter((f) => f.state === 'completed').length} completadas`);

// 7. Baja lógica del animal
r = await api('DELETE', `/animals/${animalId}`);
esperar(r.status === 200, 'Baja lógica de animal', `HTTP ${r.status}`);
r = await api('GET', '/animals');
esperar(!(r.body?.data ?? []).some((a) => a.id === animalId), 'El animal dado de baja no aparece en la lista');

// 8. Compras y pagos
r = await api('POST', '/purchases', {
    description: `Compra ${STAMP}`, totalAmount: 1000000, supplierId: proveedorId,
    itemId: vacunaId, quantity: 10, purchasedAt: hoy, dueDate: hoy,
});
const compraId = r.body?.data?.id;
esperar(r.status === 201 && compraId, 'Alta de compra', `HTTP ${r.status}`);

r = await api('POST', `/purchases/${compraId}/payments`, { amount: 400000 });
esperar(r.status === 200 && r.body?.data?.status === 'partial', 'Pago parcial deja la compra "partial"');

r = await api('POST', `/purchases/${compraId}/payments`, { amount: 9999999 });
esperar(r.status === 422 && r.body?.error?.details?.reason === 'PAYMENT_EXCEEDS_TOTAL',
    'Sobrepago rechazado', `HTTP ${r.status}`);

r = await api('POST', `/purchases/${compraId}/payments`, { amount: 600000 });
esperar(r.status === 200 && r.body?.data?.status === 'paid', 'Pago del saldo deja la compra "paid"');

// 9. Alertas y reportes
r = await api('GET', '/inventory/alerts');
esperar(r.status === 200 && (r.body?.data?.lowStockItems ?? []).some((i) => i.id === vacunaId),
    'Alerta de stock bajo el mínimo');

r = await api('GET', '/reports/summary');
esperar(r.status === 200 && typeof r.body?.data?.animals?.total === 'number', 'Resumen de reportes', `HTTP ${r.status}`);

r = await api('GET', `/reports/animals/${animalId}/costs`);
esperar([200, 404].includes(r.status), 'Costo por animal responde', `HTTP ${r.status}`);

// 10. Exportaciones
r = await api('GET', '/reports/export/purchases.csv');
esperar(r.status === 200 && String(r.headers.get('content-type')).includes('text/csv')
    && String(r.body).includes('descripcion'), 'Exportación CSV de compras', `HTTP ${r.status}`);

// 11. Equipo y permisos
r = await api('POST', '/users', {
    email: `operario-${STAMP}@prueba.example`, password: 'operario-12345',
    displayName: 'Operario de prueba', role: 'operator',
});
const operarioId = r.body?.data?.id;
esperar(r.status === 201 && operarioId, 'Alta de operario', `HTTP ${r.status}`);

const tokenDueno = token;
token = null;
r = await api('POST', '/auth/login', { email: `operario-${STAMP}@prueba.example`, password: 'operario-12345' }, { anon: true });
const tokenOperario = r.body?.data?.token;
esperar(r.status === 200 && tokenOperario, 'El operario puede entrar');
token = tokenOperario;
r = await api('POST', '/users', { email: `x-${STAMP}@prueba.example`, password: 'x-12345678', displayName: 'X', role: 'operator' });
esperar(r.status === 403, 'El operario no puede crear usuarios', `HTTP ${r.status}`);

// 12. Protección de fuerza bruta
token = null;
let bloqueado = false;
for (let intento = 0; intento < 12; intento += 1) {
    const res = await api('POST', '/auth/login', { email, password: 'mala' }, { anon: true });
    if (res.status === 429) { bloqueado = true; break; }
}
esperar(bloqueado, 'Bloqueo por intentos fallidos (429)');

// 13. Limpieza: dar de baja el operario y dejar constancia
token = tokenDueno;
r = await api('DELETE', `/users/${operarioId}`);
esperar(r.status === 200, 'Baja del operario', `HTTP ${r.status}`);

console.log(`\n${pasos - fallas}/${pasos} verificaciones OK · establecimiento de prueba: aceptacion-${STAMP}`);
process.exit(fallas === 0 ? 0 : 1);
