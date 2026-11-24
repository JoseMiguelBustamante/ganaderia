-- 010_breeding_protocol: standard 7-phase breeding protocol template (T1).
-- One POST creates the full 'Cría' protocol; a second call returns the
-- existing one instead of failing, so callers can be idempotent.
BEGIN;

CREATE OR REPLACE PROCEDURE sp_create_breeding_protocol(
    p_tenant_id uuid,
    INOUT p_protocol json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_id uuid;
    v_protocol_id uuid;
    v_phase_name text;
    v_counter int := 0;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_existing_id FROM protocol_definitions
    WHERE tenant_id = p_tenant_id AND tenant_id = app_tenant_id() AND name = 'Cría'
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        SELECT json_build_object('id', d.id, 'name', d.name, 'existed', true, 'phases',
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', ph.id, 'phaseNumber', ph.phase_number, 'name', ph.name,
                'requiredItemId', ph.required_item_id, 'requiredQty', ph.required_qty
            ) ORDER BY ph.phase_number), '[]'::jsonb)::json)
        INTO p_protocol
        FROM protocol_definitions d
        LEFT JOIN protocol_phases ph
            ON ph.protocol_id = d.id AND ph.tenant_id = d.tenant_id
        WHERE d.id = v_existing_id AND d.tenant_id = p_tenant_id
            AND d.tenant_id = app_tenant_id()
        GROUP BY d.id, d.name;
        RETURN;
    END IF;

    INSERT INTO protocol_definitions (tenant_id, name)
    VALUES (p_tenant_id, 'Cría') RETURNING id INTO v_protocol_id;

    FOR v_phase_name, v_counter IN
        SELECT name, ord FROM unnest(ARRAY[
            'Chequeo', 'Preparo', 'Inseminación', 'Gestación',
            'Preparto', 'Parto', 'Destete'
        ]) WITH ORDINALITY AS t(name, ord)
    LOOP
        INSERT INTO protocol_phases (tenant_id, protocol_id, phase_number, name)
        VALUES (p_tenant_id, v_protocol_id, v_counter, v_phase_name);
    END LOOP;

    SELECT json_build_object('id', d.id, 'name', d.name, 'existed', false, 'phases',
        jsonb_agg(jsonb_build_object(
            'id', ph.id, 'phaseNumber', ph.phase_number, 'name', ph.name,
            'requiredItemId', ph.required_item_id, 'requiredQty', ph.required_qty
        ) ORDER BY ph.phase_number)::json)
    INTO p_protocol
    FROM protocol_definitions d
    JOIN protocol_phases ph ON ph.protocol_id = d.id AND ph.tenant_id = d.tenant_id
    WHERE d.id = v_protocol_id AND d.tenant_id = p_tenant_id
        AND d.tenant_id = app_tenant_id()
    GROUP BY d.id, d.name;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_protocols(p_tenant_id uuid)
RETURNS SETOF protocol_definitions
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT d.* FROM protocol_definitions d
    WHERE d.tenant_id = p_tenant_id AND d.tenant_id = app_tenant_id()
    ORDER BY d.created_at;
$$;

COMMIT;
