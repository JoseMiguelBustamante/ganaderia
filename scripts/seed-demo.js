#!/usr/bin/env node
// Seeds a demo tenant with realistic-looking data through the PUBLIC API,
// so everything passes the same validations a real user would.
// Usage: node scripts/seed-demo.js [API_BASE]
// Defaults to production. Idempotent: if the demo tenant already has
// animals, it stops after signing in.
//
// Demo credentials it creates:
//   email:    demo@lafortuna.example
//   password: demo12345
//   tenant:   Estancia La Fortuna (slug la-fortuna-demo)
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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
        const reason = payload?.error?.details?.reason ?? payload?.error?.code ?? res.status;
        const err = new Error(`${method} ${path} -> ${res.status} ${reason}`);
        err.reason = reason;
        throw err;
    }
    return payload.data ?? payload;
}

console.log(`[seed] API: ${BASE}`);

// 1. Sign in; register the demo tenant when it does not exist yet.
try {
    const session = await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    token = session.token;
    console.log('[seed] login ok (tenant ya existía)');
} catch {
    const session = await api('POST', '/auth/register', {
        tenantName: 'Estancia La Fortuna',
        slug: 'la-fortuna-demo',
        email: EMAIL,
        password: PASSWORD,
        displayName: 'Ramón Ferreira',
    });
    token = session.token;
    console.log('[seed] tenant demo creado');
}

const animals = await api('GET', '/animals');
if (animals.length > 0) {
    console.log(`[seed] el tenant ya tiene ${animals.length} animales; nada que hacer.`);
    process.exit(0);
}

// 2. Suppliers
const genetica = await api('POST', '/suppliers', {
    name: 'Genética Sur', contactName: 'Marcela Duarte',
    phone: '+595981445566', email: 'ventas@geneticasur.example',
});
const veterinaria = await api('POST', '/suppliers', {
    name: 'Vet Campo Central', contactName: 'Dr. Iván Sosa',
    phone: '+595973112233', email: 'pedidos@vetcentral.example',
});
console.log('[seed] proveedores ok');

// 3. Inventory: healthy items, one under minimum (red), one semen item.
const aftosa = await api('POST', '/inventory', {
    name: 'Vacuna Aftosa', category: 'vaccine', unit: 'dosis', minStock: 5,
});
await api('POST', `/inventory/${aftosa.id}/stock`, { qty: 12 });

const brucelosis = await api('POST', '/inventory', {
    name: 'Vacuna Brucelosis', category: 'vaccine', unit: 'dosis', minStock: 4,
});
await api('POST', `/inventory/${brucelosis.id}/stock`, { qty: 2 });

const vitaminas = await api('POST', '/inventory', {
    name: 'Vitamina AD3E', category: 'supply', unit: 'ml', minStock: 2,
});
await api('POST', `/inventory/${vitaminas.id}/stock`, { qty: 9 });

const semen = await api('POST', '/inventory', {
    name: 'Semen Ajax — Toros del Sur', category: 'semen', unit: 'dosis', minStock: 6,
});
await api('POST', `/inventory/${semen.id}/stock`, { qty: 12 });
console.log('[seed] inventario ok (1 item bajo mínimo)');

// 4. Semen lots: one nearly empty (gold notice), one expired (red), one healthy.
const loteB = await api('POST', '/semen-lots', {
    itemId: semen.id, supplierId: genetica.id,
    lotCode: 'AJ-2026-B', totalDoses: 12,
});
await api('POST', `/semen-lots/${loteB.id}/consume`, { doses: 10 });

const loteV = await api('POST', '/semen-lots', {
    itemId: semen.id, supplierId: genetica.id,
    lotCode: 'AX-2025-V', totalDoses: 6, expiresAt: '2026-10-15',
});

const loteC = await api('POST', '/semen-lots', {
    itemId: semen.id, supplierId: genetica.id,
    lotCode: 'AJ-2026-C', totalDoses: 20, expiresAt: '2028-03-31',
});
console.log('[seed] lotes ok (1 casi agotado, 1 vencido)');

// 5. Breeding protocol (standard 7 phases).
const cria = await api('POST', '/protocols/breeding');

// 6. Animals with plausible names/ear tags and varied progress.
const row = [
    ['A-1042', 'Fortuna', 'female', 2],
    ['A-0117', 'Luna', 'female', 3],
    ['A-0388', 'Pampa', 'female', 1],
    ['A-0521', 'Canela', 'female', 0],
    ['A-0612', 'Milonga', 'female', 0],
    ['M-1101', 'Tordillo', 'male', 0],
    ['M-1205', 'Bravo', 'male', 0],
    ['A-0733', 'Estrella', 'female', 1],
];
for (const [earTag, name, sex, completadas] of row) {
    const animal = await api('POST', '/animals', {
        earTag, name, sex,
        breed: sex === 'female' ? 'Nelore' : 'Brangus',
        birthDate: '2024-03-12',
    });
    for (let phase = 1; phase <= completadas; phase += 1) {
        await api('POST', `/protocols/animals/${animal.id}/execute`, {
            protocolId: cria.id, phaseNumber: phase,
            notes: phase === cria ? undefined : 'Sin novedad',
        });
    }
}
console.log('[seed] 8 animales con avance variado ok');
console.log('[seed] LISTO — ingrese con:');
console.log(`[seed]   email:    ${EMAIL}`);
console.log(`[seed]   password: ${PASSWORD}`);
