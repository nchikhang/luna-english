import type { Card, Deck } from '@/types';
import { getDatabase } from './schema';
import { schedulePush } from '@/services/sync';

/**
 * Phase E changes:
 * - Mọi mutation set updated_at = now() để sync engine biết row đã thay đổi
 * - DELETE → soft delete (set deleted_at, updated_at)
 * - Mọi SELECT user-facing thêm filter deleted_at IS NULL
 * - Sau mỗi mutation gọi schedulePush() (debounced 5s)
 */

// ============================================================
// DECK QUERIES
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

export async function getAllDecks(): Promise<Deck[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DeckRow>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM cards c
             WHERE c.deck_id = d.id AND c.deleted_at IS NULL) AS card_count
     FROM decks d
     WHERE d.deleted_at IS NULL
     ORDER BY d.updated_at DESC`
  );
  return rows.map(mapDeckRow);
}

export async function getDeckById(id: string): Promise<Deck | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DeckRow>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM cards c
             WHERE c.deck_id = d.id AND c.deleted_at IS NULL) AS card_count
     FROM decks d
     WHERE d.id = ? AND d.deleted_at IS NULL`,
    [id]
  );
  return row ? mapDeckRow(row) : null;
}

export interface CreateDeckInput {
  name: string;
  description?: string;
}

export async function createDeck(input: CreateDeckInput): Promise<Deck> {
  const db = await getDatabase();
  const id = generateId('deck');
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO decks (id, name, description, language, card_count, created_at, updated_at)
     VALUES (?, ?, ?, 'en', 0, ?, ?)`,
    [id, input.name, input.description ?? null, now, now]
  );

  const created = await getDeckById(id);
  if (!created) throw new Error('Failed to create deck');
  schedulePush();
  return created;
}

export interface UpdateDeckInput {
  name?: string;
  description?: string;
}

export async function updateDeck(id: string, input: UpdateDeckInput): Promise<Deck> {
  const db = await getDatabase();
  const now = new Date().toISOString();
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
  values.push(id);

  await db.runAsync(`UPDATE decks SET ${fields.join(', ')} WHERE id = ?`, values);

  const updated = await getDeckById(id);
  if (!updated) throw new Error(`Deck ${id} not found after update`);
  schedulePush();
  return updated;
}

export async function deleteDeck(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  // Soft delete: set deleted_at và updated_at để sync engine push lên server
  // Cards bên trong cũng cần soft-delete để consistent
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE decks SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
    await db.runAsync(
      `UPDATE cards SET deleted_at = ?, updated_at = ?
       WHERE deck_id = ? AND deleted_at IS NULL`,
      [now, now, id]
    );
  });
  schedulePush();
}

// ============================================================
// CARD QUERIES
// ============================================================

interface CardRow {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  image_url: string | null;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
}

function mapCardRow(row: CardRow): Card {
  return {
    id: row.id,
    deckId: row.deck_id,
    word: row.word,
    meaning: row.meaning,
    pronunciation: row.pronunciation ?? undefined,
    exampleSentence: row.example_sentence ?? undefined,
    exampleTranslation: row.example_translation ?? undefined,
    imageUrl: row.image_url ?? undefined,
    easeFactor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getCardsByDeckId(deckId: string): Promise<Card[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CardRow>(
    `SELECT * FROM cards
     WHERE deck_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [deckId]
  );
  return rows.map(mapCardRow);
}

export async function getCardById(id: string): Promise<Card | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CardRow>(
    `SELECT * FROM cards WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return row ? mapCardRow(row) : null;
}

export interface CreateCardInput {
  deckId: string;
  word: string;
  meaning: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
}

export async function createCard(input: CreateCardInput): Promise<Card> {
  const db = await getDatabase();
  const id = generateId('card');
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO cards (
       id, deck_id, word, meaning, pronunciation,
       example_sentence, example_translation,
       ease_factor, interval, repetitions,
       next_review_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 2.5, 0, 0, ?, ?, ?)`,
    [
      id,
      input.deckId,
      input.word,
      input.meaning,
      input.pronunciation ?? null,
      input.exampleSentence ?? null,
      input.exampleTranslation ?? null,
      now,
      now,
      now,
    ]
  );

  await db.runAsync(`UPDATE decks SET updated_at = ? WHERE id = ?`, [now, input.deckId]);

  const created = await getCardById(id);
  if (!created) throw new Error('Failed to create card');
  schedulePush();
  return created;
}

export interface UpdateCardInput {
  word?: string;
  meaning?: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
}

export async function updateCard(id: string, input: UpdateCardInput): Promise<Card> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  const fieldMap: Record<keyof UpdateCardInput, string> = {
    word: 'word',
    meaning: 'meaning',
    pronunciation: 'pronunciation',
    exampleSentence: 'example_sentence',
    exampleTranslation: 'example_translation',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    const value = input[key as keyof UpdateCardInput];
    if (value !== undefined) {
      fields.push(`${dbField} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    const existing = await getCardById(id);
    if (!existing) throw new Error(`Card ${id} not found`);
    return existing;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  await db.runAsync(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, values);

  const updated = await getCardById(id);
  if (!updated) throw new Error(`Card ${id} not found after update`);
  schedulePush();
  return updated;
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  // Soft delete để sync lên server
  await db.runAsync(
    `UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, id]
  );
  schedulePush();
}

// ============================================================
// STUDY SESSION QUERIES
// ============================================================

export async function getCardsDueForReview(
  deckId: string,
  newCardsLimit: number = 10
): Promise<Card[]> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const reviewRows = await db.getAllAsync<CardRow>(
    `SELECT * FROM cards
     WHERE deck_id = ?
       AND deleted_at IS NULL
       AND repetitions > 0
       AND next_review_at <= ?
     ORDER BY next_review_at ASC`,
    [deckId, now]
  );

  const newRows = await db.getAllAsync<CardRow>(
    `SELECT * FROM cards
     WHERE deck_id = ?
       AND deleted_at IS NULL
       AND repetitions = 0
     ORDER BY created_at ASC
     LIMIT ?`,
    [deckId, newCardsLimit]
  );

  const allCards = [...reviewRows, ...newRows].map(mapCardRow);
  return shuffle(allCards);
}

export async function getDueCountForDeck(
  deckId: string,
  newCardsLimit: number = 10
): Promise<{ reviewDue: number; newCards: number; total: number }> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const reviewResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards
     WHERE deck_id = ? AND deleted_at IS NULL
       AND repetitions > 0 AND next_review_at <= ?`,
    [deckId, now]
  );

  const newResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards
     WHERE deck_id = ? AND deleted_at IS NULL AND repetitions = 0`,
    [deckId]
  );

  const reviewDue = reviewResult?.count ?? 0;
  const newCards = Math.min(newResult?.count ?? 0, newCardsLimit);

  return { reviewDue, newCards, total: reviewDue + newCards };
}

export interface ApplyReviewInput {
  cardId: string;
  rating: number;
  srsUpdate: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewAt: string;
  };
}

export async function applyReview(input: ApplyReviewInput): Promise<Card> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const { cardId, rating, srsUpdate } = input;

  const existing = await getCardById(cardId);
  if (!existing) throw new Error(`Card ${cardId} not found`);
  const intervalBefore = existing.interval;

  await db.runAsync(
    `UPDATE cards SET
       ease_factor = ?,
       interval = ?,
       repetitions = ?,
       next_review_at = ?,
       last_reviewed_at = ?,
       updated_at = ?
     WHERE id = ?`,
    [
      srsUpdate.easeFactor,
      srsUpdate.interval,
      srsUpdate.repetitions,
      srsUpdate.nextReviewAt,
      now,
      now,
      cardId,
    ]
  );

  const logId = `log_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  await db.runAsync(
    `INSERT INTO review_logs (id, card_id, rating, reviewed_at, interval_before, interval_after, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [logId, cardId, rating, now, intervalBefore, srsUpdate.interval]
  );

  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Card ${cardId} not found after update`);
  schedulePush();
  return updated;
}

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix: 'deck' | 'card'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
