-- 007_inventory_stage: stage catalog tag on inventory items (Fase 2 / M2, T2).
-- Optional `stage` marks which cattle stage the product serves; the listing
-- filters by it. Signatures stay backward compatible: new params are appended
-- with defaults, existing callers keep working.
BEGIN;

ALTER TABLE inventory_items ADD COLUMN stage text;

CREATE OR REPLACE PROCEDURE sp_create_inventory_item(
    p_tenant_id uuid, p_name text, p_category text, p_unit text, p_min_stock numeric,
    p_stage text DEFAULT NULL,
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
    INSERT INTO inventory_items (tenant_id, name, category, unit, min_stock, stage)
    VALUES (p_tenant_id, p_name, p_category, p_unit, COALESCE(p_min_stock, 0), p_stage)
    RETURNING * INTO v_item;
    p_item := json_build_object(
        'id', v_item.id, 'tenantId', v_item.tenant_id, 'name', v_item.name,
        'category', v_item.category, 'unit', v_item.unit, 'stockQty', v_item.stock_qty,
        'minStock', v_item.min_stock, 'isActive', v_item.is_active, 'stage', v_item.stage
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_inventory_items(p_tenant_id uuid, p_stage text DEFAULT NULL)
RETURNS SETOF inventory_items
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT i.* FROM inventory_items i
    WHERE i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id()
      AND (p_stage IS NULL OR i.stage = p_stage)
    ORDER BY i.name;
$$;

COMMIT;
