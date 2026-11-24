-- 018_edit_and_deactivate: update and soft-delete for animals and inventory
-- items (bloque de entrega, T1). Animal status already models 'sold' and
-- 'deceased'; inventory items use is_active. Deleting is always logical so
-- the history (movements, executions) stays intact.
BEGIN;

CREATE OR REPLACE PROCEDURE sp_update_animal(
    p_tenant_id uuid, p_animal_id uuid,
    p_ear_tag text, p_name text, p_breed text, p_birth_date date,
    p_chip_serial text, p_notes text, p_status text,
    INOUT p_animal json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_animal animals;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE animals SET
        ear_tag = COALESCE(p_ear_tag, ear_tag),
        name = COALESCE(p_name, name),
        breed = COALESCE(p_breed, breed),
        birth_date = COALESCE(p_birth_date, birth_date),
        chip_serial = COALESCE(p_chip_serial, chip_serial),
        notes = COALESCE(p_notes, notes),
        status = COALESCE(p_status, status)
    WHERE id = p_animal_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
    RETURNING * INTO v_animal;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ANIMAL_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_animal := json_build_object(
        'id', v_animal.id, 'tenantId', v_animal.tenant_id, 'earTag', v_animal.ear_tag,
        'name', v_animal.name, 'sex', v_animal.sex, 'breed', v_animal.breed,
        'birthDate', v_animal.birth_date, 'chipSerial', v_animal.chip_serial,
        'status', v_animal.status, 'notes', v_animal.notes
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_deactivate_animal(
    p_tenant_id uuid, p_animal_id uuid,
    INOUT p_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE animals SET status = 'deceased'
    WHERE id = p_animal_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
      AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ANIMAL_NOT_ACTIVE' USING ERRCODE = 'P0001';
    END IF;
    p_id := p_animal_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_inventory_item(
    p_tenant_id uuid, p_item_id uuid,
    p_name text, p_unit text, p_min_stock numeric, p_stage text,
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
    UPDATE inventory_items SET
        name = COALESCE(p_name, name),
        unit = COALESCE(p_unit, unit),
        min_stock = COALESCE(p_min_stock, min_stock),
        stage = COALESCE(p_stage, stage)
    WHERE id = p_item_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
      AND is_active
    RETURNING * INTO v_item;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_item := json_build_object(
        'id', v_item.id, 'tenantId', v_item.tenant_id, 'name', v_item.name,
        'category', v_item.category, 'unit', v_item.unit, 'stockQty', v_item.stock_qty,
        'minStock', v_item.min_stock, 'isActive', v_item.is_active, 'stage', v_item.stage
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_deactivate_inventory_item(
    p_tenant_id uuid, p_item_id uuid,
    INOUT p_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE inventory_items SET is_active = false
    WHERE id = p_item_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
      AND is_active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_id := p_item_id;
END;
$$;

-- Listing stays active-only for the app; the row keeps its history.
CREATE OR REPLACE FUNCTION fn_get_all_animals(
    p_tenant_id uuid, p_search text DEFAULT NULL, p_include_inactive boolean DEFAULT false
)
RETURNS SETOF animals
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT a.*
    FROM animals a
    WHERE a.tenant_id = p_tenant_id
      AND a.tenant_id = app_tenant_id()
      AND (p_include_inactive IS TRUE OR a.status = 'active')
      AND (p_search IS NULL
        OR a.ear_tag ILIKE '%' || p_search || '%'
        OR a.name ILIKE '%' || p_search || '%'
        OR a.chip_serial ILIKE '%' || p_search || '%')
    ORDER BY a.ear_tag;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_inventory_items(
    p_tenant_id uuid, p_stage text DEFAULT NULL, p_include_inactive boolean DEFAULT false
)
RETURNS SETOF inventory_items
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT i.* FROM inventory_items i
    WHERE i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id()
      AND (p_include_inactive IS TRUE OR i.is_active)
      AND (p_stage IS NULL OR i.stage = p_stage)
    ORDER BY i.name;
$$;

COMMIT;
