#!/usr/bin/env node
// Prueba de carga ligera sin dependencias (sustituye a k6 en este entorno).
//
//   node scripts/carga.js [API_BASE] [USUARIOS] [SEGUNDOS]
//
// Simula usuarios concurrentes contra los caminos que el campo usa a diario y
// reporta latencias p50/p95/p99 y errores. Un establecimiento de 50 animales no
// genera decenas de requests por segundo: el objetivo es que p95 se mantenga
// bajo ~500 ms con ráfagas de trabajo simultáneo.
const BASE = process.argv[2] ?? 'https://ganaderia.187.127.19.244.sslip.io/api';
const USUARIOS = Number(process.argv[3] ?? 10);
const SEGUNDOS = Number(process.argv[4] ?? 20);
// El guardián de producción permite 600 req/min por IP. La prueba se auto-limita
// para medir latencia real en vez de medir el propio límite.
const MAX_RPS = Number(process.env.MAX_RPS ?? 8);
const pausaMs = Math.max(0, Math.round(1000 / MAX_RPS));

const STAMP = Date.now().toString(36);
const email = `carga-${STAMP}@prueba.example`;

const stats = [];
let errores = 0;
let limitados = 0;
let peticiones = 0;

const pct = (p) => {
    if (stats.length === 0) return 0;
    const orden = [...stats].sort((a, b) => a - b);
    return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
};

async function api(token, method, path, body) {
    const inicio = performance.now();
    try {
        const res = await fetch(`${BASE}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const tipo = res.headers.get('content-type') ?? '';
        const payload = tipo.includes('json') ? await res.json().catch(() => null) : await res.text();
        stats.push(performance.now() - inicio);
        peticiones += 1;
        // El guardián por IP responde 429: se cuenta aparte para no confundirlo
        // con una falla del servicio.
        if (res.status === 429) limitados += 1;
        else if (res.status >= 500) errores += 1;
        return { status: res.status, body: payload };
    } catch {
        stats.push(performance.now() - inicio);
        peticiones += 1;
        errores += 1;
        return { status: 0, body: null };
    }
}

console.log(`Carga: ${USUARIOS} usuarios durante ${SEGUNDOS}s (máx ~${MAX_RPS} req/s) contra ${BASE}\n`);

const registro = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tenantName: `Carga ${STAMP}`, slug: `carga-${STAMP}`,
        email, password: 'carga-12345', displayName: 'Carga',
    }),
});
const sesion = await registro.json();
const token = sesion?.data?.token;
if (!token) {
    if (registro.status === 429) {
        console.error('El guardián por IP está limitando (429). Esperá un minuto o corré desde otra IP.');
    } else {
        console.error('No se pudo preparar el establecimiento de prueba:', registro.status);
    }
    process.exit(1);
}

// Datos mínimos para que las lecturas devuelvan trabajo real.
const animal = await api(token, 'POST', '/animals', { earTag: `C-${STAMP}`, sex: 'female' });
const animalId = animal.body?.data?.id;
const insumo = await api(token, 'POST', '/inventory', { name: `Insumo carga ${STAMP}`, category: 'supply' });
const insumoId = insumo.body?.data?.id;
await api(token, 'POST', `/inventory/${insumoId}/stock`, { qty: 100 });

const fin = Date.now() + SEGUNDOS * 1000;

const rutas = [
    ['GET', '/animals'],
    ['GET', `/animals/${animalId}`],
    ['GET', '/inventory'],
    ['GET', '/inventory/alerts'],
    ['GET', '/reports/summary'],
];

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const trabajador = async (indice) => {
    while (Date.now() < fin) {
        const [metodo, ruta] = rutas[indice % rutas.length];
        await api(token, metodo, ruta);
        if (indice % 5 === 0) {
            await api(token, 'POST', `/inventory/${insumoId}/stock`, { qty: 1 });
        }
        await dormir(pausaMs * USUARIOS);
    }
};

await Promise.all(Array.from({ length: USUARIOS }, (_, i) => trabajador(i)));

const rps = (peticiones / SEGUNDOS).toFixed(1);
console.log(`  peticiones: ${peticiones} · ${rps} req/s · errores: ${errores} · limitadas por el guardián: ${limitados}`);
console.log(`  latencia p50: ${pct(50).toFixed(0)} ms`);
console.log(`  latencia p95: ${pct(95).toFixed(0)} ms`);
console.log(`  latencia p99: ${pct(99).toFixed(0)} ms`);

const objetivo = pct(95) < 500 && errores === 0;
console.log(`\n${objetivo ? 'PASS' : 'FAIL'}: p95 ${pct(95).toFixed(0)} ms (objetivo < 500 ms) con ${errores} errores`);
if (limitados > 0) {
    console.log(`Nota: ${limitados} respuestas 429 son el límite por IP (API_RATE_MAX, 600/min).`);
    console.log('Para medir capacidad real, subí API_RATE_MAX en el panel de Dokploy o probá desde otra IP.');
}
process.exit(objetivo ? 0 : 1);
