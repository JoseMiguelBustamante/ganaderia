-- 005_protocol_engine: data-driven phases and atomic input consumption (T5).
BEGIN;

CREATE TABLE protocol_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE TABLE protocol_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    protocol_id uuid NOT NULL REFERENCES protocol_definitions (id) ON DELETE CASCADE,
    phase_number int NOT NULL CHECK (phase_number BETWEEN 1 AND 7),
    name text NOT NULL,
    required_item_id uuid REFERENCES inventory_items (id) ON DELETE SET NULL,
    required_qty numeric(12,3),
    CHECK ((required_item_id IS NULL AND required_qty IS NULL)
        OR (required_item_id IS NOT NULL AND required_qty > 0)),
    UNIQUE (protocol_id, phase_number)
);
CREATE TABLE phase_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    animal_id uuid NOT NULL REFERENCES animals (id) ON DELETE CASCADE,
    protocol_id uuid NOT NULL REFERENCES protocol_definitions (id) ON DELETE CASCADE,
    phase_number int NOT NULL CHECK (phase_number BETWEEN 1 AND 7),
    team_id uuid REFERENCES teams (id) ON DELETE SET NULL,
    executed_by uuid NOT NULL,
    executed_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    UNIQUE (animal_id, protocol_id, phase_number)
);

ALTER TABLE protocol_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_definitions_isolation ON protocol_definitions
    USING (tenant_id = app_tenant_id());
ALTER TABLE protocol_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_phases_isolation ON protocol_phases
    USING (tenant_id = app_tenant_id());
ALTER TABLE phase_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY phase_executions_isolation ON phase_executions
    USING (tenant_id = app_tenant_id());

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
        INSERT INTO protocol_phases (tenant_id, protocol_id, phase_number, name, required_item_id, required_qty)
        VALUES (p_tenant_id, v_protocol_id, v_number, v_phase->>'name', v_item_id,
            (v_phase->>'requiredQty')::numeric);
    END LOOP;
    SELECT json_build_object('id', v_protocol_id, 'name', p_name, 'phases',
        jsonb_agg(jsonb_build_object(
            'id', id, 'phaseNumber', phase_number, 'name', name,
            'requiredItemId', required_item_id, 'requiredQty', required_qty
        ) ORDER BY phase_number)::json)
    INTO p_protocol FROM protocol_phases
    WHERE protocol_id = v_protocol_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id();
END;
$$;

CREATE OR REPLACE PROCEDURE sp_complete_phase(
    p_tenant_id uuid, p_animal_id uuid, p_protocol_id uuid, p_phase_number int,
    p_team_id uuid, p_user_id uuid, p_notes text,
    INOUT p_execution json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_phase protocol_phases;
    v_execution phase_executions;
    v_movement_id uuid;
    v_count int;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM protocol_definitions
        WHERE id = p_protocol_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()) THEN
        RAISE EXCEPTION 'PROTOCOL_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    -- Serialize completions for an animal so sequence checks also hold under concurrency.
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
    IF v_phase.required_item_id IS NOT NULL THEN
        -- Ledger first, guarded discount second; an exception rolls both back with the CALL.
        INSERT INTO stock_movements (tenant_id, item_id, delta_qty, reason, animal_id)
        VALUES (p_tenant_id, v_phase.required_item_id, -v_phase.required_qty, 'phase_completion', p_animal_id)
        RETURNING id INTO v_movement_id;
        UPDATE inventory_items SET stock_qty = stock_qty - v_phase.required_qty
        WHERE id = v_phase.required_item_id AND tenant_id = p_tenant_id
            AND tenant_id = app_tenant_id() AND stock_qty >= v_phase.required_qty;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
        END IF;
    END IF;
    INSERT INTO phase_executions (tenant_id, animal_id, protocol_id, phase_number, team_id, executed_by, notes)
    VALUES (p_tenant_id, p_animal_id, p_protocol_id, p_phase_number, p_team_id, p_user_id, p_notes)
    RETURNING * INTO v_execution;
    p_execution := json_build_object(
        'id', v_execution.id, 'animalId', v_execution.animal_id, 'protocolId', v_execution.protocol_id,
        'phaseNumber', v_execution.phase_number, 'teamId', v_execution.team_id,
        'executedAt', v_execution.executed_at,
        'requiredInput', CASE WHEN v_movement_id IS NULL THEN NULL ELSE json_build_object(
            'itemId', v_phase.required_item_id, 'qty', v_phase.required_qty, 'movementId', v_movement_id
        ) END
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_phase_executions(p_tenant_id uuid, p_animal_id uuid)
RETURNS SETOF phase_executions
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT e.* FROM phase_executions e
    WHERE e.animal_id = p_animal_id AND e.tenant_id = p_tenant_id AND e.tenant_id = app_tenant_id()
    ORDER BY e.protocol_id, e.phase_number;
$$;

COMMIT;
