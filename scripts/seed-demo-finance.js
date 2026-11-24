#!/usr/bin/env node
// Adds realistic purchases and payments to the demo tenant, so the reports
// screen and the payables summary show real numbers. Idempotent: it stops
// when the tenant already has purchases.
//
// Requires the demo tenant from seed-demo.js:
//   demo@lafortuna.example / demo12345
const BASE = process.argv[2] ?? 'https://ganaderia.187.127.19.244.sslip.io/api';
const EMAIL = 'demo@lafortuna.example';
const PASSWORD = 'demo12345';

let token = null;

async function api(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(`${method} ${path} -> ${res.status} ${payload?.error?.details?.reason ?? payload?.error?.code}`);
    }
    return payload.data ?? payload;
}

const hoy = new Date();
const dia = (offset) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
};

const session = await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
token = session.token;
console.log('[fin] login ok');

const existentes = await api('GET', '/purchases');
if (existentes.length > 0) {
    console.log(`[fin] ya hay ${existentes.length} compras; nada que hacer.`);
    process.exit(0);
}

const inventario = await api('GET', '/inventory');
const insumo = (nombre) => inventario.find((i) => i.name.includes(nombre))?.id;
const proveedores = await api('GET', '/suppliers');
const genetica = proveedores.find((s) => s.name.includes('Genética')) ?? proveedores[0];
const veterinaria = proveedores.find((s) => s.name.includes('Vet')) ?? proveedores[0];

const compras = [
    {
        supplierId: genetica?.id, description: 'Semen Ajax — 20 dosis',
        totalAmount: 4800000, itemId: insumo('Semen'), quantity: 20,
        purchasedAt: dia(-20), dueDate: dia(10),
    },
    {
        supplierId: veterinaria?.id, description: 'Vacuna Aftosa — 20 dosis',
        totalAmount: 1450000, itemId: insumo('Aftosa'), quantity: 20,
        purchasedAt: dia(-14), dueDate: dia(-2),
    },
    {
        supplierId: veterinaria?.id, description: 'Vitamina AD3E — 10 frascos',
        totalAmount: 620000, itemId: insumo('Vitamina'), quantity: 10,
        purchasedAt: dia(-6), dueDate: dia(24),
    },
];

const creadas = [];
for (const compra of compras) {
    creadas.push(await api('POST', '/purchases', compra));
}
console.log(`[fin] ${creadas.length} compras cargadas`);

// One purchase fully paid, one partially paid, one pending (overdue).
await api('POST', `/purchases/${creadas[0].id}/payments`, { amount: creadas[0].totalAmount });
await api('POST', `/purchases/${creadas[1].id}/payments`, { amount: 500000 });
console.log('[fin] pagos registrados (1 total, 1 parcial, 1 pendiente vencida)');

const resumen = await api('GET', '/purchases/payables-summary');
console.log('[fin] cuentas por pagar:', JSON.stringify(resumen));
