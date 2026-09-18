-- Esquema del Radar Comercial en Cloudflare D1.
-- Replica las 4 tablas de Supabase con los mismos nombres de columna para que
-- el respaldo JSON (Equipo > Respaldo de datos) se pueda cargar tal cual.
-- Sin claves foráneas a propósito: un respaldo con filas huérfanas no debe
-- bloquear la recuperación.

CREATE TABLE IF NOT EXISTS managers (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  iniciales   TEXT,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  rol         TEXT,
  activo      INTEGER NOT NULL DEFAULT 1,
  es_admin    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS contactos (
  id           TEXT PRIMARY KEY,
  nombre       TEXT NOT NULL,
  empresa      TEXT,
  area         TEXT,
  cargo        TEXT,
  email        TEXT,
  telefono     TEXT,
  cumple       TEXT,
  pais         TEXT,
  prioridad    TEXT,
  last_touch   TEXT,
  next_touch   TEXT,
  estado       TEXT DEFAULT 'activo',
  pausa_hasta  TEXT,
  pausa_motivo TEXT,
  oportunidad  TEXT,
  notas        TEXT,
  manager_id   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_contactos_manager ON contactos (manager_id);
CREATE INDEX IF NOT EXISTS idx_contactos_next ON contactos (next_touch);

CREATE TABLE IF NOT EXISTS actividades (
  id              TEXT PRIMARY KEY,
  contacto_id     TEXT,
  autor_id        TEXT,
  tipo            TEXT,
  fecha           TEXT,
  resultado       TEXT,
  proximos_pasos  TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_actividades_contacto ON actividades (contacto_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades (fecha);

CREATE TABLE IF NOT EXISTS proyectos (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  contacto_id   TEXT,
  monto         REAL,
  fecha_cierre  TEXT,
  estado        TEXT DEFAULT 'ganado',
  manager_id    TEXT,
  notas         TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_proyectos_manager ON proyectos (manager_id);
