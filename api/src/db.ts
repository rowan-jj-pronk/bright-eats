import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

export function openDatabase(path = process.env.DB_PATH ?? './data/brighte-eats.sqlite') {
  const databasePath = path === ':memory:' ? path : resolve(path);

  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

export type Db = ReturnType<typeof openDatabase>;