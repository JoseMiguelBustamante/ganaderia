-- 003_animals: individual creation and tenant-scoped reads (T4, S2/S3).
BEGIN;

CREATE TABLE animals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    ear_tag     text NOT NULL,
    name        text,
    sex         text NOT NULL CHECK (sex IN ('female', 'male')),
    breed       text,
    birth_date  date,
    chip_serial text,
    status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deceased')),
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_animals_active_ear_tag ON animals (tenant_id, upper(ear_tag))
    WHERE status = 'active';
CREATE UNIQUE INDEX idx_animals_active_chip_serial ON animals (tenant_id, chip_serial)
    WHERE chip_serial IS NOT NULL AND status = 'active';
CREATE INDEX idx_animals_tenant_status ON animals (tenant_id, status);

ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY animals_isolation ON animals
    USING (tenant_id = app_tenant_id());

CREATE OR REPLACE PROCEDURE sp_create_animal(
    p_tenant_id uuid,
    p_ear_tag text,
    p_name text,
    p_sex text,
    p_breed text,
    p_birth_date date,
    p_chip_serial text,
    p_notes text,
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

    INSERT INTO animals (tenant_id, ear_tag, name, sex, breed, birth_date, chip_serial, notes)
    VALUES (p_tenant_id, p_ear_tag, p_name, p_sex, p_breed, p_birth_date, p_chip_serial, p_notes)
    RETURNING * INTO v_animal;

    p_animal := json_build_object(
        'id', v_animal.id,
        'tenantId', v_animal.tenant_id,
        'earTag', v_animal.ear_tag,
        'name', v_animal.name,
        'sex', v_animal.sex,
        'breed', v_animal.breed,
        'birthDate', v_animal.birth_date,
        'chipSerial', v_animal.chip_serial,
        'status', v_animal.status,
        'notes', v_animal.notes,
        'createdAt', v_animal.created_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_animals(p_tenant_id uuid, p_search text DEFAULT NULL)
RETURNS SETOF animals
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT a.*
    FROM animals a
    WHERE a.tenant_id = p_tenant_id
      AND a.tenant_id = app_tenant_id()
      AND (p_search IS NULL
        OR a.ear_tag ILIKE '%' || p_search || '%'
        OR a.name ILIKE '%' || p_search || '%'
        OR a.chip_serial ILIKE '%' || p_search || '%');
$$;

CREATE OR REPLACE FUNCTION fn_get_animal_by_id(p_tenant_id uuid, p_animal_id uuid)
RETURNS SETOF animals
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT a.*
    FROM animals a
    WHERE a.tenant_id = p_tenant_id
      AND a.tenant_id = app_tenant_id()
      AND a.id = p_animal_id
    LIMIT 1;
$$;

COMMIT;
