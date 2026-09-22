import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export const getLocalDatabase = async (): Promise<Database> => {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'local-dev.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('✅ Connected to SQLite database for local development');
  return db;
};

export const closeLocalDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('SQLite database connection closed');
  }
};

export default getLocalDatabase;