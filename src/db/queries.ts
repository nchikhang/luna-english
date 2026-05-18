import type { Deck } from '@/types';
import { getDatabase } from './schema';

/**
 * Database query functions.
 *
 * Pattern: mỗi function nhận tham số rõ ràng, trả về Promise.
 * UI không cần biết SQL — chỉ gọi function này.
 */

// ============================================================
// Row type — SQLite trả về snake_case, ta map sang camelCase
// ============================================================
interface DeckRow {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  language: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

function mapDeckRow(row: DeckRow): Deck {
  return {
    id: row.id,
    userId: row.user_id ?? '',
    name: row.name,
    description: row.description ?? undefined,
    language: row.language as 'en',
    cardCount: row.card_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// CRUD functions
// ============================================================

/**
 * Lấy tất cả deck, sắp xếp mới nhất trước.
 */
export async function getAllDecks(): Promise<Deck[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DeckRow>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
     FROM decks d
     ORDER BY d.updated_at DESC`
  );
  return rows.map(mapDeckRow);
}

/**
 * Lấy 1 deck theo id. Trả về null nếu không tồn tại.
 */
export async function getDeckById(id: string): Promise<Deck | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DeckRow>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
     FROM decks d
     WHERE d.id = ?`,
    [id]
  );
  return row ? mapDeckRow(row) : null;
}

/**
 * Tạo deck mới. Auto-generate id và timestamps.
 */
export interface CreateDeckInput {
  name: string;
  description?: string;
}

export async function createDeck(input: CreateDeckInput): Promise<Deck> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO decks (id, name, description, language, card_count, created_at, updated_at)
     VALUES (?, ?, ?, 'en', 0, ?, ?)`,
    [id, input.name, input.description ?? null, now, now]
  );

  // Đọc lại để trả về object đầy đủ (đảm bảo đồng bộ với DB)
  const created = await getDeckById(id);
  if (!created) throw new Error('Failed to create deck');
  return created;
}

/**
 * Cập nhật thông tin deck. Chỉ update các field được truyền vào.
 */
export interface UpdateDeckInput {
  name?: string;
  description?: string;
}

export async function updateDeck(
  id: string,
  input: UpdateDeckInput
): Promise<Deck> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Dynamic SQL: chỉ update field nào được truyền
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description);
  }

  if (fields.length === 0) {
    const existing = await getDeckById(id);
    if (!existing) throw new Error(`Deck ${id} not found`);
    return existing;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id); // for WHERE

  await db.runAsync(
    `UPDATE decks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await getDeckById(id);
  if (!updated) throw new Error(`Deck ${id} not found after update`);
  return updated;
}

/**
 * Xóa deck (và cascade xóa tất cả card trong deck đó).
 * Cascade được setup trong schema.ts qua FOREIGN KEY ... ON DELETE CASCADE.
 */
export async function deleteDeck(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
}

// ============================================================
// Helpers
// ============================================================

/**
 * Sinh id ngẫu nhiên dạng `deck_xxxxxxxx`.
 * Đủ unique cho local DB. Khi sync backend sẽ dùng UUID v4.
 */
function generateId(): string {
  return `deck_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}