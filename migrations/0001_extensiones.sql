-- Extensiones que el resto del esquema necesita.
-- pgcrypto: para gen_random_uuid() y funciones de hash si hacen falta más adelante.
-- btree_gist: para las restricciones EXCLUDE de vigencias no solapadas (asignacion_programa, sprint 4).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
