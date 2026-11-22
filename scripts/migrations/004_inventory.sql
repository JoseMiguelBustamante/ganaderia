-- 004_inventory: tenant-scoped inventory and stock ledger (T5, S3/S5).
BEGIN;

CREATE TABLE inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('vaccine', 'semen', 'supply')),
    unit text NOT NULL DEFAULT 'unit',
    stock_qty numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    min_stock numeric(12,3) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
    delta_qty numeric(12,3) NOT NULL,
    reason text NOT NULL,
    animal_id uuid REFERENCES animals (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_items_isolation ON inventory_items
    USING (tenant_id = app_tenant_id());
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movements_isolation ON stock_movements
    USING (tenant_id = app_tenant_id());

CREATE OR REPLACE PROCEDURE sp_create_inventory_item(
    p_tenant_id uuid, p_name text, p_category text, p_unit text, p_min_stock numeric,
    INOUT p_item json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item inventory_items;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    INSERT INTO inventory_items (tenant_id, name, category, unit, min_stock)
    VALUES (p_tenant_id, p_name, p_category, p_unit, COALESCE(p_min_stock, 0))
    RETURNING * INTO v_item;
    p_item := json_build_object(
        'id', v_item.id, 'tenantId', v_item.tenant_id, 'name', v_item.name,
        'category', v_item.category, 'unit', v_item.unit, 'stockQty', v_item.stock_qty,
        'minStock', v_item.min_stock, 'isActive', v_item.is_active
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_add_stock(
    p_tenant_id uuid, p_item_id uuid, p_qty numeric,
    INOUT p_item json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item inventory_items;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'ADD_STOCK_QTY_MUST_BE_POSITIVE' USING ERRCODE = 'P0001';
    END IF;
    UPDATE inventory_items SET stock_qty = stock_qty + p_qty
    WHERE id = p_item_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
    RETURNING * INTO v_item;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO stock_movements (tenant_id, item_id, delta_qty, reason)
    VALUES (p_tenant_id, p_item_id, p_qty, 'stock_addition');
    p_item := json_build_object(
        'id', v_item.id, 'tenantId', v_item.tenant_id, 'name', v_item.name,
        'category', v_item.category, 'unit', v_item.unit, 'stockQty', v_item.stock_qty,
        'minStock', v_item.min_stock, 'isActive', v_item.is_active
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_inventory_item_by_id(p_tenant_id uuid, p_item_id uuid)
RETURNS SETOF inventory_items
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT i.* FROM inventory_items i
    WHERE i.id = p_item_id AND i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_inventory_items(p_tenant_id uuid)
RETURNS SETOF inventory_items
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT i.* FROM inventory_items i
    WHERE i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id()
    ORDER BY i.name;
$$;

COMMIT;
