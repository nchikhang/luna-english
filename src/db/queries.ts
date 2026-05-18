import type { Card, Deck } from '@/types';
import { getDatabase } from './schema';

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
            (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
     FROM decks d
     ORDER BY d.updated_at DESC`
  );
  return rows.map(mapDeckRow);
}

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
  return created;
}

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

  await db.runAsync(
    `UPDATE decks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await getDeckById(id);
  if (!updated) throw new Error(`Deck ${id} not found after update`);
  return updated;
}

export async function deleteDeck(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
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

/**
 * Lấy tất cả card trong 1 deck, mới nhất trước.
 */
export async function getCardsByDeckId(deckId: string): Promise<Card[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CardRow>(
    `SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC`,
    [deckId]
  );
  return rows.map(mapCardRow);
}

export async function getCardById(id: string): Promise<Card | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CardRow>(
    `SELECT * FROM cards WHERE id = ?`,
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
       next_review_at, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 2.5, 0, 0, ?, ?)`,
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
    ]
  );

  // Update deck's updated_at để deck list refresh đúng thứ tự
  await db.runAsync(`UPDATE decks SET updated_at = ? WHERE id = ?`, [
    now,
    input.deckId,
  ]);

  const created = await getCardById(id);
  if (!created) throw new Error('Failed to create card');
  return created;
}

export interface UpdateCardInput {
  word?: string;
  meaning?: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
}

export async function updateCard(
  id: string,
  input: UpdateCardInput
): Promise<Card> {
  const db = await getDatabase();

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

  values.push(id);
  await db.runAsync(
    `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await getCardById(id);
  if (!updated) throw new Error(`Card ${id} not found after update`);
  return updated;
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix: 'deck' | 'card'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}