import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const DB_NAME = 'luna-english.db';

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      card_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      pronunciation TEXT,
      example_sentence TEXT,
      example_translation TEXT,
      image_url TEXT,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards (deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards (next_review_at);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY NOT NULL,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      interval_before INTEGER NOT NULL,
      interval_after INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_logs_card_id ON review_logs (card_id);
  `);

  console.log('[DB] Initialized successfully');
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS review_logs;
    DROP TABLE IF EXISTS cards;
    DROP TABLE IF EXISTS decks;
  `);
  await initDatabase();
}
