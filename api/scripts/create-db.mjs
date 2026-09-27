import 'dotenv/config';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

const databasePath = resolve(process.env.DB_PATH ?? './data/brighte-eats.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma('foreign_keys = ON');
database.exec(readFileSync(new URL('../src/schema/schema.sql', import.meta.url), 'utf8'));
database.prepare(`
  INSERT OR IGNORE INTO services (code, label, is_active)
  VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)
`).run('delivery', 'Delivery', 'pick-up', 'Pick-up', 'payment', 'Payment');
database.close();
