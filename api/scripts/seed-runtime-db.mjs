import 'dotenv/config';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

const databasePath = resolve(process.env.DB_PATH ?? './data/brighte-eats.sqlite');
const seedPath = '/app/seed/brighte-eats.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });

let hasLeadTable = false;
try {
  const database = new Database(databasePath);
  hasLeadTable = Boolean(
    database.prepare(`
      SELECT 1 FROM sqlite_master
      WHERE type = 'table' AND name = 'leads'
    `).get(),
  );
  database.close();
} catch {
  hasLeadTable = false;
}

if (!hasLeadTable) {
  copyFileSync(seedPath, databasePath);
}

const database = new Database(databasePath);
database.pragma('foreign_keys = ON');
database.exec(readFileSync(new URL('../src/schema/schema.sql', import.meta.url), 'utf8'));
database.prepare(`
  INSERT OR IGNORE INTO services (code, label, is_active)
  VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)
`).run('delivery', 'Delivery', 'pick-up', 'Pick-up', 'payment', 'Payment');
database.close();