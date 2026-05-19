/**
 * Mobile sync engine.
 *
 * Lifecycle:
 *   1. App mở → if (authenticated) → sync.runFullSync()
 *      - Pull changes từ lastSyncAt → apply vào SQLite
 *      - Push pending changes (rows có updated_at > lastSyncAt) lên
 *   2. Mỗi mutation local → debounce 5s → push (background)
 *   3. Hard delete vẫn ghi vào local trước, nhưng schema dùng soft delete:
 *      DELETE statements ở queries.ts cần đổi thành UPDATE deleted_at = now()
 *
 * Conflicts:
 *   - Server trả về conflicts → ghi đè local row.
 *   - Last-write-wins: nếu user vừa edit trên cả 2 thiết bị, bản editted SAU thắng.
 */

import { getDatabase } from '@/db/schema';
import { useAuthStore } from '@/stores/authStore';
import {
  pullSync,
  pushSync,
  type SyncCardWire,
  type SyncDeckWire,
  type SyncReviewLogWire,
} from '@/services/api/sync';
import { ApiError } from '@/services/api/client';

// ============================================================
// COLLECT pending changes từ SQLite
// ============================================================

interface LocalDeckRow {
  id: string;
  name: string;
  description: string | null;
  language: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface LocalCardRow {
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
  updated_at: string;
  deleted_at: string | null;
}

interface LocalReviewLogRow {
  id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
  interval_before: number;
  interval_after: number;
  synced: number; // 0/1
}

async function collectPendingChanges(since: string | null) {
  const db = await getDatabase();
  const sinceISO = since ?? '1970-01-01T00:00:00.000Z';

  const decks = await db.getAllAsync<LocalDeckRow>(
    `SELECT id, name, description, language, created_at, updated_at, deleted_at
     FROM decks WHERE updated_at > ?`,
    [sinceISO]
  );

  const cards = await db.getAllAsync<LocalCardRow>(
    `SELECT id, deck_id, word, meaning, pronunciation,
            example_sentence, example_translation, image_url,
            ease_factor, interval, repetitions,
            next_review_at, last_reviewed_at,
            created_at, updated_at, deleted_at
     FROM cards WHERE updated_at > ?`,
    [sinceISO]
  );

  const reviewLogs = await db.getAllAsync<LocalReviewLogRow>(
    `SELECT id, card_id, rating, reviewed_at, interval_before, interval_after, synced
     FROM review_logs WHERE synced = 0`
  );

  return {
    decks: decks.map(deckRowToWire),
    cards: cards.map(cardRowToWire),
    reviewLogs: reviewLogs.map(logRowToWire),
    reviewLogIds: reviewLogs.map((l) => l.id), // để mark synced sau khi push thành công
  };
}

// ============================================================
// APPLY changes pulled từ server vào SQLite
// ============================================================

async function applyPulledChanges(payload: {
  decks: SyncDeckWire[];
  cards: SyncCardWire[];
}): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const d of payload.decks) {
      // UPSERT: insert nếu chưa có, replace nếu có
      // Vì server đã thắng LWW, ta tin tưởng ghi đè local
      await db.runAsync(
        `INSERT INTO decks (id, name, description, language, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           language = excluded.language,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [d.id, d.name, d.description, d.language, d.createdAt, d.updatedAt, d.deletedAt]
      );
    }

    for (const c of payload.cards) {
      await db.runAsync(
        `INSERT INTO cards (
           id, deck_id, word, meaning, pronunciation,
           example_sentence, example_translation, image_url,
           ease_factor, interval, repetitions,
           next_review_at, last_reviewed_at,
           created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word = excluded.word,
           meaning = excluded.meaning,
           pronunciation = excluded.pronunciation,
           example_sentence = excluded.example_sentence,
           example_translation = excluded.example_translation,
           image_url = excluded.image_url,
           ease_factor = excluded.ease_factor,
           interval = excluded.interval,
           repetitions = excluded.repetitions,
           next_review_at = excluded.next_review_at,
           last_reviewed_at = excluded.last_reviewed_at,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          c.id, c.deckId, c.word, c.meaning, c.pronunciation,
          c.exampleSentence, c.exampleTranslation, c.imageUrl,
          c.easeFactor, c.interval, c.repetitions,
          c.nextReviewAt, c.lastReviewedAt,
          c.createdAt, c.updatedAt, c.deletedAt,
        ]
      );
    }
  });
}

async function markReviewLogsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE review_logs SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

// ============================================================
// Mappers SQLite row → wire format
// ============================================================

function deckRowToWire(r: LocalDeckRow): SyncDeckWire {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    language: r.language,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function cardRowToWire(r: LocalCardRow): SyncCardWire {
  return {
    id: r.id,
    deckId: r.deck_id,
    word: r.word,
    meaning: r.meaning,
    pronunciation: r.pronunciation,
    exampleSentence: r.example_sentence,
    exampleTranslation: r.example_translation,
    imageUrl: r.image_url,
    easeFactor: r.ease_factor,
    interval: r.interval,
    repetitions: r.repetitions,
    nextReviewAt: r.next_review_at,
    lastReviewedAt: r.last_reviewed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function logRowToWire(r: LocalReviewLogRow): SyncReviewLogWire {
  return {
    id: r.id,
    cardId: r.card_id,
    rating: r.rating,
    reviewedAt: r.reviewed_at,
    intervalBefore: r.interval_before,
    intervalAfter: r.interval_after,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

export interface SyncResult {
  pulled: { decks: number; cards: number };
  pushed: { decks: number; cards: number; reviewLogs: number };
  conflicts: { decks: number; cards: number };
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Full sync: pull → apply → push → mark synced.
 * - Idempotent: gọi nhiều lần liên tiếp an toàn.
 * - Single-flight: nếu đang sync, gọi lại sẽ chờ promise đang chạy.
 */
export async function runFullSync(): Promise<SyncResult> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { token, lastSyncAt, setLastSyncAt } = useAuthStore.getState();
    if (!token) {
      throw new ApiError('Chưa đăng nhập', 401, 'UNAUTHORIZED');
    }

    // 1. PULL trước — apply về local để có data mới nhất
    const pullResp = await pullSync(lastSyncAt ?? undefined);
    await applyPulledChanges({ decks: pullResp.decks, cards: pullResp.cards });

    // 2. COLLECT pending changes từ local (sau khi pull, để tránh push lại data vừa pull về)
    // Lưu ý: pulled rows có updatedAt > old lastSyncAt → cần dùng pullResp.syncedAt làm mốc mới
    const pending = await collectPendingChanges(lastSyncAt);
    console.log('[Sync] lastSyncAt:', lastSyncAt);
    console.log('[Sync] Pending decks:', pending.decks.length, pending.decks.map(d => ({ id: d.id, name: d.name, updatedAt: d.updatedAt })));
    console.log('[Sync] Pending cards:', pending.cards.length);

    // 3. PUSH lên server
    const pushResp = await pushSync({
      decks: pending.decks,
      cards: pending.cards,
      reviewLogs: pending.reviewLogs,
    });

    // 4. Apply conflicts (server's version) về local
    if (pushResp.conflicts.decks.length || pushResp.conflicts.cards.length) {
      await applyPulledChanges(pushResp.conflicts);
    }

    // 5. Mark review logs đã synced
    await markReviewLogsSynced(pending.reviewLogIds);

    // 6. Update lastSyncAt
    setLastSyncAt(pushResp.syncedAt);

    return {
      pulled: { decks: pullResp.decks.length, cards: pullResp.cards.length },
      pushed: {
        decks: pending.decks.length,
        cards: pending.cards.length,
        reviewLogs: pending.reviewLogs.length,
      },
      conflicts: {
        decks: pushResp.conflicts.decks.length,
        cards: pushResp.conflicts.cards.length,
      },
    };
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Background push only — gọi sau mỗi mutation (debounced ở caller).
 * Không pull để giảm traffic. Pull định kỳ ở app foreground hoặc manual refresh.
 */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 5000;

export function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    runFullSync().catch((err) => {
      console.warn('[Sync] Background push failed:', err.message);
    });
  }, PUSH_DEBOUNCE_MS);
}
