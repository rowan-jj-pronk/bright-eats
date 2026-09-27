CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  mobile TEXT,
  postcode TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  code TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS lead_services (
  lead_id INTEGER NOT NULL,
  service_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_id, service_code),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (service_code) REFERENCES services(code)
);

CREATE INDEX IF NOT EXISTS idx_leads_recent
  ON leads(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_lead_services_by_service
  ON lead_services(service_code, lead_id);
