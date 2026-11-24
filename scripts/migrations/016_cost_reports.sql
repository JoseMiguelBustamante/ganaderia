BEGIN;

-- Unweighted arithmetic mean of each linked purchase's unit price.
-- Accounting entries never add stock; the existing inventory ledger owns stock.
CREATE OR REPLACE FUNCTION fn_get_item_unit_cost(p_tenant_id uuid, p_item_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_cost numeric;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(avg(total_amount / quantity), 0) INTO v_cost FROM purchases
    WHERE tenant_id = p_tenant_id AND item_id = p_item_id;
    RETURN v_cost;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_animal_costs(p_tenant_id uuid, p_animal_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_result json;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM animals WHERE id = p_animal_id AND tenant_id = p_tenant_id) THEN
        RETURN NULL;
    END IF;
    SELECT json_build_object('animalId', p_animal_id,
        'totalCost', COALESCE(sum(cost), 0),
        'movements', COALESCE(json_agg(json_build_object(
            'movementId', id, 'itemId', item_id, 'itemName', name,
            'qty', qty, 'occurredAt', created_at, 'estimatedCost', cost
        ) ORDER BY created_at, id), '[]')
    ) INTO v_result FROM (
        SELECT m.id, m.item_id, i.name, -m.delta_qty AS qty, m.created_at,
            round(-m.delta_qty * fn_get_item_unit_cost(p_tenant_id, m.item_id), 2) AS cost
        FROM stock_movements m JOIN inventory_items i ON i.id = m.item_id AND i.tenant_id = p_tenant_id
        WHERE m.tenant_id = p_tenant_id AND m.animal_id = p_animal_id AND m.delta_qty < 0
    ) valued;
    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_stage_costs(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_result json;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(json_agg(json_build_object(
        'phaseNumber', phase_number, 'phaseName', name, 'executions', executions, 'estimatedCost', cost
    ) ORDER BY phase_number, name), '[]') INTO v_result FROM (
        SELECT p.phase_number, p.name, count(*) AS executions,
            COALESCE(sum(round(p.required_qty * fn_get_item_unit_cost(p_tenant_id, p.required_item_id), 2)), 0) AS cost
        FROM phase_executions e JOIN protocol_phases p
            ON p.protocol_id = e.protocol_id AND p.phase_number = e.phase_number AND p.tenant_id = p_tenant_id
        WHERE e.tenant_id = p_tenant_id
        GROUP BY p.phase_number, p.name
    ) stages;
    RETURN v_result;
END;
$$;
COMMIT;
