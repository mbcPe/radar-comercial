-- Feedback de usuarios (oct-2026).
-- Próximos pasos con estado, acciones editables y contactos archivables.

ALTER TABLE actividades ADD COLUMN pasos_hecho INTEGER NOT NULL DEFAULT 0;
ALTER TABLE actividades ADD COLUMN pasos_hecho_en TEXT;
ALTER TABLE actividades ADD COLUMN editado_en TEXT;

-- Archivar en vez de borrar: el contacto sale de listas y agenda, pero conserva su historial.
ALTER TABLE contactos ADD COLUMN archivado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contactos ADD COLUMN archivado_en TEXT;
