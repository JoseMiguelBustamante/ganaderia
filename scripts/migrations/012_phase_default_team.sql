-- 012_phase_default_team: default responsible team per phase (T3) plus a
-- minimal teams API surface via functions.
BEGIN;

ALTER TABLE protocol_phases ADD COLUMN default_team_id uuid REFERENCES teams (id) ON DELETE SET NULL;

CREATE OR REPLACE PROCEDURE sp_create_team(
    p_tenant_id uuid, p_name text,
    INOUT p_team json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_team teams;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    INSERT INTO teams (tenant_id, name) VALUES (p_tenant_id, p_name)
    RETURNING * INTO v_team;
    p_team := json_build_object('id', v_team.id, 'name', v_team.name, 'isActive', v_team.is_active);
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_teams(p_tenant_id uuid)
RETURNS SETOF teams
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT t.* FROM teams t
    WHERE t.tenant_id = p_tenant_id AND t.tenant_id = app_tenant_id()
    ORDER BY t.name;
$$;

-- sp_create_protocol: accept defaultTeamId per phase, validate tenant.
CREATE OR REPLACE PROCEDURE sp_create_protocol(
    p_tenant_id uuid, p_name text, p_phases json,
    INOUT p_protocol json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_protocol_id uuid;
    v_phase jsonb;
    v_number int;
    v_previous int := 0;
    v_item_id uuid;
    v_team_id uuid;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    INSERT INTO protocol_definitions (tenant_id, name)
    VALUES (p_tenant_id, p_name) RETURNING id INTO v_protocol_id;
    FOR v_phase IN SELECT value FROM jsonb_array_elements(p_phases::jsonb) LOOP
        v_number := (v_phase->>'phaseNumber')::int;
        IF v_number IS NULL OR v_number NOT BETWEEN 1 AND 7 OR v_number <= v_previous THEN
            RAISE EXCEPTION 'PHASES_MUST_BE_UNIQUE_AND_ASCENDING_1_7' USING ERRCODE = 'P0001';
        END IF;
        v_previous := v_number;
        v_item_id := (v_phase->>'requiredItemId')::uuid;
        IF v_item_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM inventory_items
            WHERE id = v_item_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
        ) THEN
            RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
        END IF;
        v_team_id := (v_phase->>'defaultTeamId')::uuid;
        IF v_team_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM teams
            WHERE id = v_team_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
        ) THEN
            RAISE EXCEPTION 'TEAM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO protocol_phases (tenant_id, protocol_id, phase_number, name, required_item_id, required_qty, default_team_id)
        VALUES (p_tenant_id, v_protocol_id, v_number, v_phase->>'name', v_item_id,
            (v_phase->>'requiredQty')::numeric, v_team_id);
    END LOOP;
    SELECT json_build_object('id', v_protocol_id, 'name', p_name, 'phases',
        jsonb_agg(jsonb_build_object(
            'id', id, 'phaseNumber', phase_number, 'name', name,
            'requiredItemId', required_item_id, 'requiredQty', required_qty,
            'defaultTeamId', default_team_id
        ) ORDER BY phase_number)::json)
    INTO p_protocol FROM protocol_phases
    WHERE protocol_id = v_protocol_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id();
END;
$$;

-- sp_complete_phase: fall back to the phase default team when no team is sent.
CREATE OR REPLACE PROCEDURE sp_complete_phase(
    p_tenant_id uuid, p_animal_id uuid, p_protocol_id uuid, p_phase_number int,
    p_team_id uuid, p_user_id uuid, p_notes text,
    p_semen_lot_id uuid DEFAULT NULL, p_doses integer DEFAULT NULL,
    INOUT p_execution json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_phase protocol_phases;
    v_execution phase_executions;
    v_movement_id uuid;
    v_count int;
    v_item inventory_items;
    v_lot semen_lots;
    v_use_lot boolean;
    v_qty numeric;
    v_team uuid;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM protocol_definitions
        WHERE id = p_protocol_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()) THEN
        RAISE EXCEPTION 'PROTOCOL_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    PERFORM 1 FROM animals
    WHERE id = p_animal_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ANIMAL_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    SELECT * INTO v_phase FROM protocol_phases
    WHERE protocol_id = p_protocol_id AND phase_number = p_phase_number
        AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PHASE_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    SELECT count(*) INTO v_count FROM phase_executions
    WHERE animal_id = p_animal_id AND protocol_id = p_protocol_id AND phase_number < p_phase_number
        AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id();
    IF v_count <> p_phase_number - 1 THEN
        RAISE EXCEPTION 'PHASE_OUT_OF_SEQUENCE' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM phase_executions
        WHERE animal_id = p_animal_id AND protocol_id = p_protocol_id AND phase_number = p_phase_number
            AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()) THEN
        RAISE EXCEPTION 'PHASE_ALREADY_COMPLETED' USING ERRCODE = 'P0001';
    END IF;

    -- Team: explicit value wins; otherwise the phase default; validated.
    v_team := COALESCE(p_team_id, v_phase.default_team_id);
    IF v_team IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM teams
        WHERE id = v_team AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
    ) THEN
        RAISE EXCEPTION 'TEAM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;

    v_use_lot := p_semen_lot_id IS NOT NULL;
    IF v_use_lot THEN
        IF p_doses IS NULL OR p_doses <= 0 THEN
            RAISE EXCEPTION 'DOSES_MUST_BE_POSITIVE' USING ERRCODE = 'P0001';
        END IF;
        IF v_phase.required_item_id IS NULL THEN
            RAISE EXCEPTION 'PHASE_HAS_NO_REQUIRED_ITEM' USING ERRCODE = 'P0001';
        END IF;
        SELECT * INTO v_item FROM inventory_items
        WHERE id = v_phase.required_item_id AND tenant_id = p_tenant_id
            AND tenant_id = app_tenant_id();
        IF NOT FOUND THEN
            RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
        END IF;
        IF v_item.category <> 'semen' THEN
            RAISE EXCEPTION 'ITEM_NOT_SEMEN' USING ERRCODE = 'P0001';
        END IF;
        SELECT * INTO v_lot FROM semen_lots
        WHERE id = p_semen_lot_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
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
        IF v_lot.item_id <> v_item.id THEN
            RAISE EXCEPTION 'LOT_ITEM_MISMATCH' USING ERRCODE = 'P0001';
        END IF;

        UPDATE semen_lots
        SET available_doses = available_doses - p_doses,
            status = CASE WHEN available_doses - p_doses = 0 THEN 'depleted' ELSE 'available' END
        WHERE id = v_lot.id
        RETURNING * INTO v_lot;

        UPDATE inventory_items SET stock_qty = stock_qty - p_doses
        WHERE id = v_item.id
        RETURNING * INTO v_item;

        INSERT INTO stock_movements (tenant_id, item_id, delta_qty, reason, animal_id)
        VALUES (p_tenant_id, v_item.id, -p_doses, 'phase_lot_consumption', p_animal_id)
        RETURNING id INTO v_movement_id;
        v_qty := p_doses;
    ELSIF v_phase.required_item_id IS NOT NULL THEN
        SELECT * INTO v_item FROM inventory_items
        WHERE id = v_phase.required_item_id AND tenant_id = p_tenant_id
            AND tenant_id = app_tenant_id();
        IF NOT FOUND THEN
            RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO stock_movements (tenant_id, item_id, delta_qty, reason, animal_id)
        VALUES (p_tenant_id, v_phase.required_item_id, -v_phase.required_qty, 'phase_completion', p_animal_id)
        RETURNING id INTO v_movement_id;
        UPDATE inventory_items SET stock_qty = stock_qty - v_phase.required_qty
        WHERE id = v_phase.required_item_id AND tenant_id = p_tenant_id
            AND tenant_id = app_tenant_id() AND stock_qty >= v_phase.required_qty;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
        END IF;
        v_qty := v_phase.required_qty;
    END IF;

    INSERT INTO phase_executions (tenant_id, animal_id, protocol_id, phase_number, team_id, executed_by, notes)
    VALUES (p_tenant_id, p_animal_id, p_protocol_id, p_phase_number, v_team, p_user_id, p_notes)
    RETURNING * INTO v_execution;
    p_execution := json_build_object(
        'id', v_execution.id, 'animalId', v_execution.animal_id, 'protocolId', v_execution.protocol_id,
        'phaseNumber', v_execution.phase_number, 'teamId', v_execution.team_id,
        'executedAt', v_execution.executed_at,
        'requiredInput', CASE WHEN v_movement_id IS NULL THEN NULL ELSE json_build_object(
            'itemId', v_item.id, 'lotId', CASE WHEN v_use_lot THEN v_lot.id ELSE NULL END,
            'qty', v_qty, 'movementId', v_movement_id
        ) END
    );
END;
$$;

COMMIT;
