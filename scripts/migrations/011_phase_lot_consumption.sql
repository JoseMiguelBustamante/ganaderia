-- 011_phase_lot_consumption: complete a phase consuming ONE specific semen
-- lot (T2). Atomic in a single CALL: execution + lot deduction + item stock
-- + ledger row with the animal link. Optional params appended so existing
-- callers keep their signature.
BEGIN;

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

    -- Input consumption: either the phase's default item or an explicit lot.
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
    VALUES (p_tenant_id, p_animal_id, p_protocol_id, p_phase_number, p_team_id, p_user_id, p_notes)
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
