-- 008_semen_lots: tenant-scoped semen lots (Fase 2 / M2, T3).
-- A lot ties doses to a semen inventory item and a supplier. Consumption is
-- atomic: one transaction deducts from the lot and the item stock and writes
-- a ledger movement (sp_consume_semen_lot). The animal link keeps the
-- expense-to-animal traceability the valorization plan requires.
BEGIN;

CREATE TABLE semen_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES suppliers (id) ON DELETE SET NULL,
    lot_code text NOT NULL,
    total_doses integer NOT NULL CHECK (total_doses > 0),
    available_doses integer NOT NULL CHECK (available_doses >= 0),
    expires_at date,
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'depleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, lot_code)
);

ALTER TABLE semen_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY semen_lots_isolation ON semen_lots
    USING (tenant_id = app_tenant_id());

CREATE OR REPLACE PROCEDURE sp_create_semen_lot(
    p_tenant_id uuid, p_item_id uuid, p_supplier_id uuid, p_lot_code text,
    p_total_doses integer, p_expires_at date,
    INOUT p_lot json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item inventory_items;
    v_lot semen_lots;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_item FROM inventory_items i
    WHERE i.id = p_item_id AND i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    IF v_item.category <> 'semen' THEN
        RAISE EXCEPTION 'ITEM_NOT_SEMEN' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO semen_lots (tenant_id, item_id, supplier_id, lot_code, total_doses, available_doses, expires_at)
    VALUES (p_tenant_id, p_item_id, p_supplier_id, p_lot_code, p_total_doses, p_total_doses, p_expires_at)
    RETURNING * INTO v_lot;
    p_lot := json_build_object(
        'id', v_lot.id, 'tenantId', v_lot.tenant_id, 'itemId', v_lot.item_id,
        'supplierId', v_lot.supplier_id, 'lotCode', v_lot.lot_code,
        'totalDoses', v_lot.total_doses, 'availableDoses', v_lot.available_doses,
        'expiresAt', v_lot.expires_at, 'status', v_lot.status
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_consume_semen_lot(
    p_tenant_id uuid, p_lot_id uuid, p_doses integer, p_animal_id uuid,
    INOUT p_lot json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_lot semen_lots;
    v_item inventory_items;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF p_doses IS NULL OR p_doses <= 0 THEN
        RAISE EXCEPTION 'DOSES_MUST_BE_POSITIVE' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_lot FROM semen_lots s
    WHERE s.id = p_lot_id AND s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LOT_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    IF v_lot.status = 'depleted' THEN
        RAISE EXCEPTION 'LOT_DEPLETED' USING ERRCODE = 'P0001';
    END IF;
    IF v_lot.available_doses < p_doses THEN
        RAISE EXCEPTION 'NOT_ENOUGH_DOSES' USING ERRCODE = 'P0001';
    END IF;

    UPDATE semen_lots
    SET available_doses = available_doses - p_doses,
        status = CASE WHEN available_doses - p_doses = 0 THEN 'depleted' ELSE 'available' END
    WHERE id = v_lot.id
    RETURNING * INTO v_lot;

    UPDATE inventory_items
    SET stock_qty = stock_qty - p_doses
    WHERE id = v_lot.item_id
    RETURNING * INTO v_item;

    INSERT INTO stock_movements (tenant_id, item_id, delta_qty, reason, animal_id)
    VALUES (p_tenant_id, v_lot.item_id, -p_doses, 'semen_lot_consumption', p_animal_id);

    p_lot := json_build_object(
        'id', v_lot.id, 'tenantId', v_lot.tenant_id, 'itemId', v_lot.item_id,
        'supplierId', v_lot.supplier_id, 'lotCode', v_lot.lot_code,
        'totalDoses', v_lot.total_doses, 'availableDoses', v_lot.available_doses,
        'expiresAt', v_lot.expires_at, 'status', v_lot.status
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_semen_lot_by_id(p_tenant_id uuid, p_lot_id uuid)
RETURNS SETOF semen_lots
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT s.* FROM semen_lots s
    WHERE s.id = p_lot_id AND s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_semen_lots(p_tenant_id uuid)
RETURNS SETOF semen_lots
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT s.* FROM semen_lots s
    WHERE s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
    ORDER BY s.created_at DESC;
$$;

COMMIT;
