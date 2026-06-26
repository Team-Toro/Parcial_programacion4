-- Migration: add personalizacion_snapshot to detalle_pedidos
-- Run once against the existing database.
-- Safe to run multiple times (IF NOT EXISTS guard via DO block).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'detalle_pedidos'
          AND column_name = 'personalizacion_snapshot'
    ) THEN
        ALTER TABLE detalle_pedidos
            ADD COLUMN personalizacion_snapshot JSON NULL;
    END IF;
END
$$;
