import * as SQLite from 'expo-sqlite';

/**
 * SQLite schema cho Luna English.
 *
 * Phase E changes (so với phase D):
 * - Thêm `updated_at`, `deleted_at` cho cards (decks đã có updated_at)
 * - Thêm `synced` (0/1) cho review_logs để biết log nào đã push lên server
 * - Tự migrate DB cũ qua PRAGMA user_version
 *
 * Migration strategy:
 *   v0 (chưa có user_version): schema cũ → bump lên v1
 *   v1: schema có sync fields
 */

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const DB_NAME = 'luna-english.db';
const SCHEMA_VERSION = 1;

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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards (deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards (next_review_at);
    CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards (updated_at);
    CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON decks (updated_at);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY NOT NULL,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      interval_before INTEGER NOT NULL,
      interval_after INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_logs_card_id ON review_logs (card_id);
    CREATE INDEX IF NOT EXISTS idx_logs_synced ON review_logs (synced);
  `);

  await runMigrations(db);
  console.log('[DB] Initialized successfully');
}

/**
 * Migrate DB cũ (Phase D) sang schema mới (Phase E).
 * SQLite không hỗ trợ ADD COLUMN với DEFAULT non-constant tốt, nên ta dùng try-catch.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    `PRAGMA user_version`
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) return;

  console.log(`[DB] Migrating from v${currentVersion} to v${SCHEMA_VERSION}`);

  // v0 → v1: thêm sync fields nếu DB cũ thiếu
  if (currentVersion < 1) {
    await safeAddColumn(db, 'cards', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now'))");
    await safeAddColumn(db, 'cards', 'deleted_at', 'TEXT');
    await safeAddColumn(db, 'decks', 'deleted_at', 'TEXT');
    await safeAddColumn(db, 'review_logs', 'synced', 'INTEGER NOT NULL DEFAULT 0');

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards (updated_at);
      CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON decks (updated_at);
      CREATE INDEX IF NOT EXISTS idx_logs_synced ON review_logs (synced);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/**
 * ALTER TABLE ADD COLUMN với guard: bỏ qua nếu cột đã tồn tại.
 * SQLite không có IF NOT EXISTS cho ADD COLUMN.
 */
async function safeAddColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  def: string
): Promise<void> {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    console.log(`[DB] Added ${table}.${column}`);
  } catch (err) {
    // Column tồn tại rồi, ignore
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS review_logs;
    DROP TABLE IF EXISTS cards;
    DROP TABLE IF EXISTS decks;
    PRAGMA user_version = 0;
  `);
  await initDatabase();
}
