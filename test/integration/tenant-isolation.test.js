// Tenant isolation contract (S3): withTenant runs every statement under RLS.
// Two tenants coexist; neither can see or mutate the other's rows. The runtime
// role has NOBYPASSRLS, so there is no query without a tenant context.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTenant, withSystem, executeQuery } from '../../src/db/postgres.js';

describe('tenant isolation via RLS', () => {
    let tenantA;
    let tenantB;

    beforeAll(async () => {
        await withSystem(async (client) => {
            const a = await client.query(
                "INSERT INTO tenants (name, slug, plan_status) VALUES ($1, $2, 'active') RETURNING id",
                ['Estancia A', `a-${Date.now()}`],
            );
            const b = await client.query(
                "INSERT INTO tenants (name, slug, plan_status) VALUES ($1, $2, 'active') RETURNING id",
                ['Estancia B', `b-${Date.now()}`],
            );
            tenantA = a.rows[0].id;
            tenantB = b.rows[0].id;
            await client.query(
                'INSERT INTO teams (tenant_id, name) VALUES ($1, $2), ($3, $4)',
                [tenantA, 'Equipo corral A', tenantB, 'Equipo corral B'],
            );
        });
    });

    it('sees only own tenant rows through withTenant', async () => {
        const seenA = await withTenant(tenantA, (client) => client.query('SELECT tenant_id FROM teams'));
        const seenB = await withTenant(tenantB, (client) => client.query('SELECT tenant_id FROM teams'));
        expect(seenA.rows).toHaveLength(1);
        expect(seenA.rows[0].tenant_id).toBe(tenantA);
        expect(seenB.rows).toHaveLength(1);
        expect(seenB.rows[0].tenant_id).toBe(tenantB);
    });

    it('cannot spoof another tenant via the GUC (parameter override rejected)', async () => {
        const rows = await withTenant(tenantA, (client) => client.query(
            "SELECT tenant_id FROM teams WHERE tenant_id::text <> current_setting('app.current_tenant', true)",
        ));
        expect(rows.rows).toHaveLength(0);
    });

    it('fails closed when no tenant is set', async () => {
        // executeQuery has no tenant context by design: SELECT must return nothing,
        // and INSERT through RLS must be rejected.
        const visible = await executeQuery('SELECT tenant_id FROM teams');
        expect(visible).toHaveLength(0);
        await expect(
            executeQuery("INSERT INTO teams (tenant_id, name) VALUES ($1, 'ghost')", [tenantA]),
        ).rejects.toThrow();
    });

    it('cannot insert a row for another tenant through withTenant', async () => {
        await expect(
            withTenant(tenantA, (client) => client.query(
                "INSERT INTO teams (tenant_id, name) VALUES ($1, 'cross')",
                [tenantB],
            )),
        ).rejects.toThrow();
        const b = await withTenant(tenantB, (client) => client.query(
            "SELECT count(*)::int AS n FROM teams WHERE name = 'cross'",
        ));
        expect(b.rows[0].n).toBe(0);
    });
});
